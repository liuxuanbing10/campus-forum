/** @file Dropzone 图片拖拽上传组件 */
import { useCallback, useRef, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X } from 'lucide-react';

interface DropzoneProps {
  maxSize?: number; // bytes
  accept?: Record<string, string[]>;
  onFilesSelected: (files: File[]) => void;
}

export default function Dropzone({ maxSize = 10 * 1024 * 1024, accept = { 'image/*': [] }, onFilesSelected }: DropzoneProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const onDrop = useCallback((accepted: File[]) => {
    if (accepted.length) {
      const file = accepted[0];
      if (file.size > maxSize) return;
      if (file.type.startsWith('image/')) {
        setPreview(URL.createObjectURL(file));
      }
      onFilesSelected(accepted);
    }
  }, [onFilesSelected, maxSize]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept, multiple: false });

  return (
    <div className="relative">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
        }`}
      >
        <input ref={inputRef} {...getInputProps()} />
        {isDragActive ? (
          <p className="text-primary font-body">松手上传图片</p>
        ) : preview ? (
          <div className="relative inline-block">
            <img src={preview} alt="预览" className="max-h-48 rounded-lg mx-auto" />
            <button
              onClick={(e) => { e.stopPropagation(); setPreview(null); inputRef.current?.click(); }}
              className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <>
            <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground font-body">点击或拖拽上传图片</p>
            <p className="text-xs text-muted-foreground mt-1">支持 JPG/PNG/GIF，最大 10MB</p>
          </>
        )}
      </div>
    </div>
  );
}
