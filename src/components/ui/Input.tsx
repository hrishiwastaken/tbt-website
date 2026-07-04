import { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

interface FieldProps {
  label: string;
  id: string;
  required?: boolean;
  error?: string;
}

export function Input({
  label,
  id,
  required,
  error,
  ...rest
}: FieldProps & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <div className="floating-group">
        <input
          id={id}
          placeholder=" "
          required={required}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          className="floating-input"
          {...rest}
        />
        <label htmlFor={id} className="floating-label">
          {label}
          {required ? " *" : ""}
        </label>
      </div>
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1.5 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

export function Textarea({
  label,
  id,
  required,
  error,
  rows = 4,
  ...rest
}: FieldProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <div>
      <div className="floating-group">
        <textarea
          id={id}
          placeholder=" "
          required={required}
          rows={rows}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          className="floating-input resize-none"
          {...rest}
        />
        <label htmlFor={id} className="floating-label">
          {label}
          {required ? " *" : ""}
        </label>
      </div>
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1.5 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
