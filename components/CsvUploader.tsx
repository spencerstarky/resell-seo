'use client';

import { useState, useCallback } from 'react';
import Papa from 'papaparse';
import { Upload, FileText, X } from 'lucide-react';

interface CsvUploaderProps {
    onUpload: (data: any[]) => void;
}

export default function CsvUploader({ onUpload }: CsvUploaderProps) {
    const [isDragActive, setIsDragActive] = useState(false);
    const [file, setFile] = useState<File | null>(null);

    const handleDrag = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setIsDragActive(true);
        } else if (e.type === 'dragleave') {
            setIsDragActive(false);
        }
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            processFile(e.dataTransfer.files[0]);
        }
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            processFile(e.target.files[0]);
        }
    };

    const processFile = (file: File) => {
        if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
            alert('Please upload a CSV file.');
            return;
        }
        setFile(file);
        Papa.parse(file, {
            header: true,
            complete: (results) => {
                onUpload(results.data);
            },
            error: (error) => {
                console.error('CSV Error:', error);
                alert('Error parsing CSV');
            }
        });
    };

    const removeFile = () => {
        setFile(null);
    };

    return (
        <div className="card" style={{ borderStyle: 'dashed', borderWidth: '2px', borderColor: isDragActive ? 'var(--color-primary)' : 'var(--color-border)', backgroundColor: isDragActive ? 'rgba(100,100,255,0.05)' : undefined }}>
            {!file ? (
                <div
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    style={{ padding: '3rem', textAlign: 'center', cursor: 'pointer' }}
                    onClick={() => document.getElementById('csv-input')?.click()}
                >
                    <Upload size={48} style={{ color: 'var(--color-text-muted)', marginBottom: '1rem' }} />
                    <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Drop your eBay CSV here</h3>
                    <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>or click to browse</p>
                    <input
                        id="csv-input"
                        type="file"
                        accept=".csv"
                        onChange={handleChange}
                        style={{ display: 'none' }}
                    />
                    <span className="btn btn-secondary">Select File</span>
                </div>
            ) : (
                <div style={{ padding: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ padding: '1rem', backgroundColor: 'var(--color-bg-base)', borderRadius: 'var(--radius-md)' }}>
                            <FileText size={24} color="var(--color-primary)" />
                        </div>
                        <div>
                            <div style={{ fontWeight: 600 }}>{file.name}</div>
                            <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>{(file.size / 1024).toFixed(1)} KB</div>
                        </div>
                    </div>
                    <button onClick={removeFile} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}>
                        <X size={20} />
                    </button>
                </div>
            )}
        </div>
    );
}
