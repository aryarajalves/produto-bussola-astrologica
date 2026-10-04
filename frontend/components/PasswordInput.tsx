"use client";

import React, { useState } from "react";

interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  "data-testid"?: string;
}

export function PasswordInput({
  value,
  onChange,
  placeholder = "••••••••••••",
  required = false,
  minLength,
  "data-testid": testId = "password-input",
  className = "",
  style,
  autoComplete = "new-password",
  ...rest
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="relative w-full">
      <input
        type={showPassword ? "text" : "password"}
        required={required}
        data-testid={testId}
        minLength={minLength}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        data-lpignore="true"
        className={`w-full rounded-xl pl-3.5 pr-11 py-2.5 text-xs outline-none focus:border-purple-400 transition-all ${className}`}
        style={{
          background: "rgba(255, 255, 255, 0.05)",
          border: "1px solid rgba(127, 119, 221, 0.3)",
          color: "#f0eeff",
          ...style,
        }}
        {...rest}
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setShowPassword((prev) => !prev)}
        data-testid={`${testId}-toggle-visibility`}
        title={showPassword ? "Ocultar senha" : "Ver senha"}
        aria-label={showPassword ? "Ocultar senha" : "Ver senha"}
        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-purple-300 transition-colors focus:outline-none"
      >
        {showPassword ? (
          /* Ícone Olho com traço (Ocultar) */
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
            <line x1="1" y1="1" x2="23" y2="23" />
          </svg>
        ) : (
          /* Ícone Olho aberto (Ver senha) */
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </div>
  );
}
