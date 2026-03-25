import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const SECTIONS = [
  'Site & Zoning Analysis',
  'Structural & Building Condition',
  'Utility & Service Assessment',
  'Budget Analysis',
  'Regulatory & Permit Pathway',
  'Risk Assessment',
  'Recommendations & Next Steps'
];

function mergePlaceholders(templateBody, userData) {
  if (!templateBody) return '';
  return templateBody.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    const val = userData?.[key];
    if (val === undefined || val === null || val === '') return match;
    return String(val);
  });
}

function buildSectionContent(section, sIdx, allClauses, selectionByClause) {
  const sectionClauses = allClauses
    .filter(c => c.section === section)
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

  const includedClauses = sectionClauses.filter(c => {
    const sel = selectionByClause[c.id];
    return sel && sel.included;
  });

  if (includedClauses.length === 0) {
    return 'No items included for this section.\n\n';
  }

  let text = '';
  includedClauses.forEach(clause => {
    const sel = selectionByClause[clause.id];
    const userData = sel?.user_data || {};
    text += `${clause.title}\n`;
    const mergedBody = mergePlaceholders(clause.template_body, userData);
    if (mergedBody) text += mergedBody + '\n';
    if (clause.risk_level) text += `Risk Level: ${clause.risk_level}\n`;
    if (sel?.staff_notes) text += `Notes: ${sel.staff_notes}\n`;
    text += '\n';
  });
  return text;
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { studyId } = await req.json();
  if (!studyId) {
    return Response.json({ error: 'studyId is required' }, { status: 400 });
  }

  // Fetch study, clauses, selections, company settings in parallel
  const [studies, allClauses, allSelections, companySettings] = await Promise.all([
    base44.entities.FeasibilityStudy.filter({ id: studyId }),
    base44.entities.FeasibilityClause.filter({ is_active: true }),
    base44.entities.FeasibilitySelection.filter({ study_id: studyId }),
    base44.entities.CompanySettings.list(),
  ]);

  const study = studies[0];
  if (!study) {
    return Response.json({ error: 'Study not found' }, { status: 404 });
  }

  const settings = companySettings[0] || {};
  const templateDocId = settings.feasibility_template_doc_id;

  // Build clause map and selection map
  const selectionByClause = Object.fromEntries(allSelections.map(s => [s.clause_id, s]));

  // Fetch client info
  let clientName = '';
  if (study.client_id) {
    const clients = await base44.entities.Client.filter({ id: study.client_id });
    if (clients[0]) clientName = clients[0].company_name || clients[0].contact_name || '';
  }

  const ratingLabels = {
    highly_feasible: 'Highly Feasible',
    feasible_with_conditions: 'Feasible with Conditions',
    marginally_feasible: 'Marginally Feasible',
    not_feasible: 'Not Feasible'
  };

  const { accessToken: docsToken } = await base44.asServiceRole.connectors.getConnection('googledocs');
  const { accessToken: driveToken } = await base44.asServiceRole.connectors.getConnection('googledrive');
  
  let docId;

  let useTemplate = !!templateDocId;

  if (useTemplate) {
    // === TEMPLATE MODE: Copy the template, then do find-and-replace ===
    const copyRes = await fetch(`https://www.googleapis.com/drive/v3/files/${templateDocId}/copy`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${driveToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: `Feasibility Report - ${study.title}`
      })
    });

    if (!copyRes.ok) {
      console.warn('Template copy failed, falling back to creating doc from scratch');
      useTemplate = false;
    } else {
      const copiedFile = await copyRes.json();
      docId = copiedFile.id;

      // Build replacement requests for the copied doc
      const replacements = [];

      // Study-level placeholders
      const studyReplacements = {
        '{{study_title}}': study.title || '',
        '{{client_name}}': clientName,
        '{{property_address}}': study.property_address || '',
        '{{jurisdiction}}': study.jurisdiction || '',
        '{{scope_summary}}': study.scope_summary || '',
        '{{date}}': new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
        '{{overall_rating}}': ratingLabels[study.overall_feasibility_rating] || '',
      };

      for (const [placeholder, value] of Object.entries(studyReplacements)) {
        replacements.push({
          replaceAllText: {
            containsText: { text: placeholder, matchCase: false },
            replaceText: value
          }
        });
      }

      // Section content placeholders  
      SECTIONS.forEach((section, sIdx) => {
        const sectionKey = section.replace(/[^a-zA-Z0-9]/g, '_');
        const content = buildSectionContent(section, sIdx, allClauses, selectionByClause);
        replacements.push({
          replaceAllText: {
            containsText: { text: `{{SECTION_${sectionKey}}}`, matchCase: false },
            replaceText: content
          }
        });
        replacements.push({
          replaceAllText: {
            containsText: { text: `{{SECTION_${section}}}`, matchCase: false },
            replaceText: content
          }
        });
      });

      // Apply replacements
      const batchRes = await fetch(`https://docs.googleapis.com/v1/documents/${docId}:batchUpdate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${docsToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ requests: replacements })
      });

      if (!batchRes.ok) {
        const err = await batchRes.text();
        return Response.json({ error: 'Failed to populate document from template', details: err }, { status: 500 });
      }

      // Insert appendix and photos into template doc
      await insertAppendixAndPhotos(docId, docsToken, driveToken, study);
    }
  }
  
  if (!useTemplate) {
    // === NO TEMPLATE: Create from scratch ===
    const createRes = await fetch('https://docs.googleapis.com/v1/documents', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${docsToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ title: `Feasibility Report - ${study.title}` })
    });

    if (!createRes.ok) {
      const err = await createRes.text();
      return Response.json({ error: 'Failed to create Google Doc', details: err }, { status: 500 });
    }

    const doc = await createRes.json();
    docId = doc.documentId;

    // Build document content as Google Docs requests
    const requests = [];
    let idx = 1;

    const insertText = (text) => {
      requests.push({ insertText: { location: { index: idx }, text } });
      idx += text.length;
    };
    const applyHeading = (start, end, headingLevel) => {
      requests.push({
        updateParagraphStyle: {
          range: { startIndex: start, endIndex: end },
          paragraphStyle: { namedStyleType: headingLevel },
          fields: 'namedStyleType'
        }
      });
    };
    const applyBold = (start, end) => {
      requests.push({
        updateTextStyle: {
          range: { startIndex: start, endIndex: end },
          textStyle: { bold: true },
          fields: 'bold'
        }
      });
    };

    // Title
    const title = `Feasibility Study Report: ${study.title}\n`;
    insertText(title);
    applyHeading(1, idx, 'HEADING_1');

    // Meta info
    const meta = [
      study.property_address ? `Property Address: ${study.property_address}` : null,
      study.jurisdiction ? `Jurisdiction: ${study.jurisdiction}` : null,
      clientName ? `Client: ${clientName}` : null,
      `Date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`,
      study.scope_summary ? `Scope: ${study.scope_summary}` : null,
    ].filter(Boolean).join('\n') + '\n\n';
    insertText(meta);

    if (study.overall_feasibility_rating) {
      const ratingText = `Overall Feasibility Rating: ${ratingLabels[study.overall_feasibility_rating] || study.overall_feasibility_rating}\n\n`;
      const ratingStart = idx;
      insertText(ratingText);
      applyBold(ratingStart, ratingStart + ratingText.length - 1);
    }

    SECTIONS.forEach((section, sIdx) => {
      const sectionHeading = `${sIdx + 1}. ${section}\n`;
      const headingStart = idx;
      insertText(sectionHeading);
      applyHeading(headingStart, idx, 'HEADING_2');

      const sectionClauses = allClauses
        .filter(c => c.section === section)
        .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
      const includedClauses = sectionClauses.filter(c => {
        const sel = selectionByClause[c.id];
        return sel && sel.included;
      });

      if (includedClauses.length === 0) {
        insertText('No items included for this section.\n\n');
        return;
      }

      includedClauses.forEach(clause => {
        const sel = selectionByClause[clause.id];
        const userData = sel?.user_data || {};
        const clauseTitle = `${clause.title}\n`;
        const ctStart = idx;
        insertText(clauseTitle);
        applyHeading(ctStart, idx, 'HEADING_3');

        const mergedBody = mergePlaceholders(clause.template_body, userData);
        if (mergedBody) insertText(mergedBody + '\n');
        if (clause.risk_level) {
          const riskLine = `Risk Level: ${clause.risk_level}\n`;
          const rlStart = idx;
          insertText(riskLine);
          applyBold(rlStart, rlStart + 'Risk Level:'.length);
        }
        if (sel?.staff_notes) {
          const notesLine = `Notes: ${sel.staff_notes}\n`;
          const nlStart = idx;
          insertText(notesLine);
          applyBold(nlStart, nlStart + 'Notes:'.length);
        }
        insertText('\n');
      });
    });

    // Appendix and photos in scratch mode — add inline
    const appendixItems = (study.appendix_items || []).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    const photos = (study.photos || []).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

    if (appendixItems.length > 0 || photos.length > 0) {
      const appxHeading = 'Appendix\n';
      const appxStart = idx;
      insertText(appxHeading);
      applyHeading(appxStart, idx, 'HEADING_1');

      appendixItems.forEach((item, i) => {
        if (item.title) {
          const itemTitle = `${item.title}\n`;
          const itStart = idx;
          insertText(itemTitle);
          applyHeading(itStart, idx, 'HEADING_2');
        }
        if (item.content) {
          insertText(item.content + '\n');
        }
        insertText('\n');
      });

      if (photos.length > 0) {
        const photoHeading = 'Photo Documentation\n';
        const phStart = idx;
        insertText(photoHeading);
        applyHeading(phStart, idx, 'HEADING_2');

        photos.forEach(photo => {
          if (photo.caption) {
            insertText(photo.caption + '\n');
          }
          insertText('[Photo: ' + (photo.url || '') + ']\n\n');
        });
      }
    }

    const batchRes = await fetch(`https://docs.googleapis.com/v1/documents/${docId}:batchUpdate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${docsToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ requests })
    });

    if (!batchRes.ok) {
      const err = await batchRes.text();
      return Response.json({ error: 'Failed to populate document', details: err }, { status: 500 });
    }

    // Now insert actual images into the scratch doc
    await insertPhotosAsImages(docId, docsToken, driveToken, study);
  }

  const docUrl = `https://docs.google.com/document/d/${docId}/edit`;

  // Update the study record
  await base44.entities.FeasibilityStudy.update(studyId, {
    generated_doc_url: docUrl,
    status: 'generated',
    last_built_at: new Date().toISOString()
  });

  return Response.json({ success: true, doc_url: docUrl, doc_id: docId });
});

// Insert photos as inline images into the doc by replacing [Photo: url] placeholders
async function insertPhotosAsImages(docId, docsToken, driveToken, study) {
  const photos = (study.photos || []).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  if (photos.length === 0) return;

  for (const photo of photos) {
    if (!photo.url) continue;
    const placeholder = '[Photo: ' + photo.url + ']';

    // Get current doc to find location of placeholder
    const docRes = await fetch(`https://docs.googleapis.com/v1/documents/${docId}`, {
      headers: { 'Authorization': `Bearer ${docsToken}` }
    });
    if (!docRes.ok) continue;
    const docData = await docRes.json();
    const fullText = extractFullText(docData);
    const placeholderIdx = fullText.indexOf(placeholder);
    if (placeholderIdx === -1) continue;

    // Delete the placeholder text, then insert inline image
    const deleteReq = {
      deleteContentRange: {
        range: { startIndex: placeholderIdx, endIndex: placeholderIdx + placeholder.length }
      }
    };
    const insertReq = {
      insertInlineImage: {
        location: { index: placeholderIdx },
        uri: photo.url,
        objectSize: {
          width: { magnitude: 400, unit: 'PT' },
          height: { magnitude: 300, unit: 'PT' }
        }
      }
    };

    await fetch(`https://docs.googleapis.com/v1/documents/${docId}:batchUpdate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${docsToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ requests: [deleteReq, insertReq] })
    });
  }
}

function extractFullText(docData) {
  let text = '';
  const content = docData.body?.content || [];
  for (const element of content) {
    if (element.paragraph) {
      for (const el of (element.paragraph.elements || [])) {
        if (el.textRun) text += el.textRun.content;
      }
    }
  }
  return text;
}

// For template mode: append appendix and photos at the end of the doc
async function insertAppendixAndPhotos(docId, docsToken, driveToken, study) {
  const appendixItems = (study.appendix_items || []).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  const photos = (study.photos || []).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

  if (appendixItems.length === 0 && photos.length === 0) return;

  // Get current doc end index
  const docRes = await fetch(`https://docs.googleapis.com/v1/documents/${docId}`, {
    headers: { 'Authorization': `Bearer ${docsToken}` }
  });
  if (!docRes.ok) return;
  const docData = await docRes.json();
  const bodyContent = docData.body?.content || [];
  let endIdx = 1;
  if (bodyContent.length > 0) {
    endIdx = bodyContent[bodyContent.length - 1].endIndex - 1;
  }

  const requests = [];
  let idx = endIdx;

  const insertText = (text) => {
    requests.push({ insertText: { location: { index: idx }, text } });
    idx += text.length;
  };
  const applyHeading = (start, end, level) => {
    requests.push({
      updateParagraphStyle: {
        range: { startIndex: start, endIndex: end },
        paragraphStyle: { namedStyleType: level },
        fields: 'namedStyleType'
      }
    });
  };

  insertText('\n');
  const appxStart = idx;
  insertText('Appendix\n');
  applyHeading(appxStart, idx, 'HEADING_1');

  appendixItems.forEach(item => {
    if (item.title) {
      const s = idx;
      insertText(item.title + '\n');
      applyHeading(s, idx, 'HEADING_2');
    }
    if (item.content) insertText(item.content + '\n');
    insertText('\n');
  });

  if (photos.length > 0) {
    const phStart = idx;
    insertText('Photo Documentation\n');
    applyHeading(phStart, idx, 'HEADING_2');

    photos.forEach(photo => {
      if (photo.caption) insertText(photo.caption + '\n');
      // Placeholder for image insertion
      insertText('[PHOTO_PLACEHOLDER:' + (photo.url || '') + ']\n\n');
    });
  }

  // Apply text insertions
  const batchRes = await fetch(`https://docs.googleapis.com/v1/documents/${docId}:batchUpdate`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${docsToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ requests })
  });

  if (!batchRes.ok) {
    console.warn('Failed to insert appendix text into template doc');
    return;
  }

  // Now replace photo placeholders with actual images
  for (const photo of photos) {
    if (!photo.url) continue;
    const placeholder = '[PHOTO_PLACEHOLDER:' + photo.url + ']';

    const dr = await fetch(`https://docs.googleapis.com/v1/documents/${docId}`, {
      headers: { 'Authorization': `Bearer ${docsToken}` }
    });
    if (!dr.ok) continue;
    const dd = await dr.json();
    const fullText = extractFullText(dd);
    const pi = fullText.indexOf(placeholder);
    if (pi === -1) continue;

    const deleteReq = {
      deleteContentRange: {
        range: { startIndex: pi, endIndex: pi + placeholder.length }
      }
    };
    const insertReq = {
      insertInlineImage: {
        location: { index: pi },
        uri: photo.url,
        objectSize: {
          width: { magnitude: 400, unit: 'PT' },
          height: { magnitude: 300, unit: 'PT' }
        }
      }
    };

    await fetch(`https://docs.googleapis.com/v1/documents/${docId}:batchUpdate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${docsToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ requests: [deleteReq, insertReq] })
    });
  }
}