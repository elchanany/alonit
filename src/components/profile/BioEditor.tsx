'use client';

import { useState, useRef, useEffect } from 'react';
import { Camera, Mic, Square, Trash2, Loader2, Image as ImageIcon } from 'lucide-react';
import { useToast } from '@/context/ToastContext';

interface BioEditorProps {
    initialBio?: string;
    initialImageUrl?: string;
    initialAudioUrl?: string;
    initialAudioDuration?: number;
    onSave: (data: { text: string; imageUrl: string; audioUrl: string; audioDuration: number }) => Promise<void>;
    onCancel: () => void;
}

export default function BioEditor({
    initialBio = '',
    initialImageUrl = '',
    initialAudioUrl = '',
    initialAudioDuration = 0,
    onSave,
    onCancel
}: BioEditorProps) {
    const { showToast } = useToast();
    const [text, setText] = useState(initialBio);
    const [imageUrl, setImageUrl] = useState(initialImageUrl);
    const [audioUrl, setAudioUrl] = useState(initialAudioUrl);
    const [audioDuration, setAudioDuration] = useState(initialAudioDuration);
    
    const [isSaving, setIsSaving] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);
    
    // Recording state
    const [isRecording, setIsRecording] = useState(false);
    const [recordingSecs, setRecordingSecs] = useState(0);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
    
    // Handle image upload
    const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
            showToast('הקובץ גדול מדי (מקסימום 5MB)', 'error');
            return;
        }
        
        setUploadingImage(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('type', 'image');
            
            const res = await fetch('/api/upload', { method: 'POST', body: formData });
            const data = await res.json();
            if (!data.success) throw new Error(data.error);
            
            setImageUrl(data.url);
        } catch (error) {
            showToast('שגיאה בהעלאת התמונה', 'error');
        } finally {
            setUploadingImage(false);
        }
    };
    
    // Recording functions
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            const chunks: Blob[] = [];
            
            mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
            mediaRecorder.onstop = async () => {
                const blob = new Blob(chunks, { type: 'audio/webm' });
                stream.getTracks().forEach(track => track.stop());
                
                // Keep duration before clearing interval
                const finalDuration = recordingSecs;
                
                // Upload audio
                try {
                    const formData = new FormData();
                    formData.append('file', new File([blob], 'audio.webm', { type: 'audio/webm' }));
                    formData.append('type', 'audio');
                    
                    const res = await fetch('/api/upload', { method: 'POST', body: formData });
                    const data = await res.json();
                    if (!data.success) throw new Error(data.error);
                    
                    setAudioUrl(data.url);
                    setAudioDuration(finalDuration);
                } catch (error) {
                    showToast('שגיאה בהעלאת ההקלטה', 'error');
                }
            };
            
            mediaRecorder.start();
            mediaRecorderRef.current = mediaRecorder;
            setIsRecording(true);
            setRecordingSecs(0);
            
            recordingIntervalRef.current = setInterval(() => {
                setRecordingSecs(prev => prev + 1);
            }, 1000);
            
        } catch (err) {
            showToast('לא ניתן לגשת למיקרופון', 'error');
        }
    };
    
    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
        }
    };
    
    const formatTime = (secs: number) => {
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };
    
    const handleSave = async () => {
        setIsSaving(true);
        await onSave({ text, imageUrl, audioUrl, audioDuration });
        setIsSaving(false);
    };

    return (
        <div className="bg-gray-800/80 border border-indigo-500/30 rounded-xl p-4 mt-4 text-right shadow-lg">
            <h3 className="text-white font-bold mb-3 flex justify-between items-center">
                עריכת ביו
            </h3>
            
            <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="ספר קצת על עצמך... (אפשר להוסיף קישורים)"
                className="w-full bg-gray-900 border border-indigo-500/30 rounded-lg p-3 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 mb-4 min-h-[80px]"
            />
            
            {/* Media Previews */}
            {(imageUrl || audioUrl) && (
                <div className="flex flex-col gap-3 mb-4">
                    {imageUrl && (
                        <div className="relative inline-block self-end">
                            <img src={imageUrl} alt="Bio Image" className="h-24 rounded-lg border border-gray-700 object-cover" />
                            <button onClick={() => setImageUrl('')} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow hover:bg-red-600 transition">
                                <Trash2 size={12} />
                            </button>
                        </div>
                    )}
                    {audioUrl && (
                        <div className="relative bg-gray-900 p-2 rounded-lg border border-indigo-500/20 flex items-center gap-3 self-end w-full max-w-xs">
                            <span className="text-2xl">🎵</span>
                            <div className="flex-1 text-sm text-indigo-300">
                                הקלטה קולית ({formatTime(audioDuration)})
                            </div>
                            <button onClick={() => { setAudioUrl(''); setAudioDuration(0); }} className="text-red-400 hover:text-red-300 p-1">
                                <Trash2 size={16} />
                            </button>
                        </div>
                    )}
                </div>
            )}
            
            {/* Actions */}
            <div className="flex items-center justify-between border-t border-gray-700 pt-3">
                <div className="flex items-center gap-2">
                    <label className="cursor-pointer text-indigo-400 hover:text-indigo-300 p-2 rounded-full hover:bg-gray-700 transition" title="הוסף תמונה">
                        <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} disabled={uploadingImage} />
                        {uploadingImage ? <Loader2 size={20} className="animate-spin" /> : <ImageIcon size={20} />}
                    </label>
                    
                    {isRecording ? (
                        <button onClick={stopRecording} className="flex items-center gap-2 bg-red-500/20 text-red-500 hover:bg-red-500/30 px-3 py-1.5 rounded-full transition">
                            <Square size={16} fill="currentColor" />
                            <span className="text-sm font-medium">{formatTime(recordingSecs)}</span>
                        </button>
                    ) : (
                        <button onClick={startRecording} disabled={!!audioUrl} className="text-indigo-400 hover:text-indigo-300 p-2 rounded-full hover:bg-gray-700 transition disabled:opacity-50 disabled:cursor-not-allowed" title="הקלטת קול">
                            <Mic size={20} />
                        </button>
                    )}
                </div>
                
                <div className="flex items-center gap-2">
                    <button onClick={onCancel} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition">
                        ביטול
                    </button>
                    <button onClick={handleSave} disabled={isSaving || isRecording || uploadingImage} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-full text-sm font-bold flex items-center gap-2 transition disabled:opacity-50">
                        {isSaving ? <Loader2 size={16} className="animate-spin" /> : 'שמור'}
                    </button>
                </div>
            </div>
        </div>
    );
}
