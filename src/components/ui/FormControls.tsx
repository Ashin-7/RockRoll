import {
  InputHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';
import './controls.css';

function joinClasses(baseClass: string, className?: string) {
  return [baseClass, className].filter(Boolean).join(' ');
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={joinClasses('ui-input', className)} {...props} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={joinClasses('ui-textarea', className)} {...props} />;
}
