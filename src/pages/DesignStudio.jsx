import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import DesignStudioUpload from '@/components/designstudio/DesignStudioUpload';
import DesignStylePicker from '@/components/designstudio/DesignStylePicker';
import DesignStudioResult from '@/components/designstudio/DesignStudioResult';

export default function DesignStudio() {
  const [step, setStep] = useState('upload'); // upload | analyzing | pick_style | generating | result
  const [imageUrl, setImageUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [selectedStyle, setSelectedStyle] = useState(null);
  const [generatedUrl, setGeneratedUrl] = useState(null);

  const handleFileSelected = async (file) => {
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setImageUrl(file_url);
      setUploading(false);

      // Immediately analyze
      setStep('analyzing');
      const res = await base44.functions.invoke('designStudio', { action: 'analyze', image_url: file_url });
      if (res.data?.success) {
        setAnalysis(res.data.analysis);
        setStep('pick_style');
      } else {
        throw new Error(res.data?.error || 'Analysis failed');
      }
    } catch (err) {
      toast.error('Something went wrong analyzing your photo. Please try again.');
      setStep('upload');
      setUploading(false);
    }
  };

  const handleGenerate = async () => {
    if (!selectedStyle) return;
    setStep('generating');
    try {
      const res = await base44.functions.invoke('designStudio', {
        action: 'generate',
        image_url: imageUrl,
        selected_style: selectedStyle,
        room_description: analysis?.room_type || 'room'
      });
      if (res.data?.success) {
        setGeneratedUrl(res.data.image_url);
        setStep('result');
      } else {
        throw new Error(res.data?.error || 'Generation failed');
      }
    } catch (err) {
      toast.error('Image generation failed. Please try again.');
      setStep('pick_style');
    }
  };

  const handleStartOver = () => {
    // Go back to style picker (keep the photo and analysis)
    setSelectedStyle(null);
    setGeneratedUrl(null);
    setStep('pick_style');
  };

  const handleFullReset = () => {
    setStep('upload');
    setImageUrl(null);
    setAnalysis(null);
    setSelectedStyle(null);
    setGeneratedUrl(null);
  };

  const handleSubmitContact = async (contact) => {
    try {
      // Create a Client + Lead in the system
      const client = await base44.entities.Client.create({
        contact_name: contact.name,
        email: contact.email,
        phone: contact.phone || '',
        notes: `Design Studio lead. Preferred style: ${selectedStyle?.name || 'Unknown'}`,
        status: 'active'
      });

      await base44.entities.Lead.create({
        client_id: client.id,
        title: `Design Studio — ${selectedStyle?.name || 'AI Design'} (${analysis?.room_type || 'Room'})`,
        source: 'AI Design Studio',
        status: 'new_project_lead',
        notes: `Style: ${selectedStyle?.name}\nRoom type: ${analysis?.room_type}\nProject notes: ${contact.notes || 'None provided'}\n\nOriginal photo: ${imageUrl}\nAI design: ${generatedUrl}`,
        estimated_precon_value: 0,
        estimated_construction_value: 0,
        status_history: [{ status: 'new_project_lead', entered_date: new Date().toISOString() }]
      });

      toast.success('Your info has been sent to our team!');
    } catch (err) {
      toast.error('There was an issue — please try again.');
      throw err;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-orange-50/20 py-8 px-4">
      <div className="max-w-xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-1.5 bg-orange-100 text-orange-700 text-xs font-semibold px-3 py-1 rounded-full mb-3">
            <Sparkles className="w-3.5 h-3.5" /> AI-Powered
          </div>
          <h1 className="text-3xl font-bold text-slate-900">Design Studio</h1>
          <p className="text-slate-500 mt-1">See your space reimagined with AI</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[
            { key: 'upload', label: 'Upload' },
            { key: 'pick_style', label: 'Choose Style' },
            { key: 'result', label: 'Your Design' },
          ].map((s, i) => {
            const stepOrder = { upload: 0, analyzing: 0, pick_style: 1, generating: 1, result: 2 };
            const current = stepOrder[step] || 0;
            const isActive = i === current;
            const isDone = i < current;
            return (
              <React.Fragment key={s.key}>
                {i > 0 && <div className={`w-8 h-px ${isDone ? 'bg-orange-400' : 'bg-slate-200'}`} />}
                <div className="flex items-center gap-1.5">
                  <div className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${
                    isDone ? 'bg-orange-500 text-white' :
                    isActive ? 'bg-orange-100 text-orange-700 ring-2 ring-orange-400' :
                    'bg-slate-100 text-slate-400'
                  }`}>
                    {isDone ? '✓' : i + 1}
                  </div>
                  <span className={`text-xs font-medium hidden sm:inline ${isActive ? 'text-orange-700' : 'text-slate-400'}`}>{s.label}</span>
                </div>
              </React.Fragment>
            );
          })}
        </div>

        {/* Content card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
          {step === 'upload' && (
            <DesignStudioUpload onFileSelected={handleFileSelected} uploading={uploading} />
          )}

          {step === 'analyzing' && (
            <div className="text-center py-16 space-y-4">
              <Loader2 className="w-10 h-10 animate-spin text-orange-500 mx-auto" />
              <div>
                <p className="font-semibold text-slate-900">Analyzing Your Space...</p>
                <p className="text-sm text-slate-500 mt-1">Our AI is studying your room's layout, features, and style potential</p>
              </div>
            </div>
          )}

          {step === 'pick_style' && analysis && (
            <DesignStylePicker
              imageUrl={imageUrl}
              analysis={analysis}
              selectedStyle={selectedStyle}
              onSelectStyle={setSelectedStyle}
              onGenerate={handleGenerate}
              generating={false}
            />
          )}

          {step === 'generating' && (
            <div className="text-center py-16 space-y-4">
              <div className="relative w-16 h-16 mx-auto">
                <Loader2 className="w-16 h-16 animate-spin text-orange-500" />
                <Sparkles className="w-6 h-6 text-orange-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>
              <div>
                <p className="font-semibold text-slate-900">Redesigning Your {analysis?.room_type || 'Room'}...</p>
                <p className="text-sm text-slate-500 mt-1">Creating your <span className="font-medium text-orange-600">{selectedStyle?.name}</span> transformation</p>
                <p className="text-xs text-slate-400 mt-2">This usually takes 10-15 seconds</p>
              </div>
            </div>
          )}

          {step === 'result' && generatedUrl && (
            <DesignStudioResult
              originalUrl={imageUrl}
              generatedUrl={generatedUrl}
              style={selectedStyle}
              onStartOver={handleStartOver}
              onSubmitContact={handleSubmitContact}
            />
          )}
        </div>

        {/* Footer */}
        {step !== 'upload' && step !== 'analyzing' && step !== 'generating' && (
          <button
            onClick={handleFullReset}
            className="block mx-auto mt-4 text-sm text-slate-400 hover:text-slate-600 transition-colors"
          >
            Start over with a new photo
          </button>
        )}

        <p className="text-center text-xs text-slate-300 mt-8">Powered by Frontier Building Group</p>
      </div>
    </div>
  );
}