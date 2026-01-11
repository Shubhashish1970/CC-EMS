import React from 'react';
import { Check } from 'lucide-react';

export const AVAILABLE_LANGUAGES = [
  'Hindi',
  'Telugu',
  'Marathi',
  'Kannada',
  'Tamil',
  'Bengali',
  'Oriya',
  'English',
] as const;

export type Language = typeof AVAILABLE_LANGUAGES[number];

interface LanguageSelectorProps {
  selectedLanguages: string[];
  onChange: (languages: string[]) => void;
  required?: boolean;
  disabled?: boolean;
}

const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  selectedLanguages,
  onChange,
  required = false,
  disabled = false,
}) => {
  const handleToggle = (language: string) => {
    if (disabled) return;
    
    if (selectedLanguages.includes(language)) {
      onChange(selectedLanguages.filter(l => l !== language));
    } else {
      onChange([...selectedLanguages, language]);
    }
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-bold text-slate-700 uppercase tracking-wide">
        Language Capabilities
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {AVAILABLE_LANGUAGES.map((language) => {
          const isSelected = selectedLanguages.includes(language);
          return (
            <button
              key={language}
              type="button"
              onClick={() => handleToggle(language)}
              disabled={disabled}
              className={`
                flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all
                ${isSelected
                  ? 'border-green-700 bg-green-50 text-green-900'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-green-300 hover:bg-green-50/50'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              <span className="font-medium text-sm">{language}</span>
              {isSelected && (
                <Check size={18} className="text-green-700 flex-shrink-0" />
              )}
            </button>
          );
        })}
      </div>
      {selectedLanguages.length === 0 && required && (
        <p className="text-xs text-red-600 mt-1">At least one language is required</p>
      )}
      {selectedLanguages.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          <span className="text-xs text-slate-500 font-medium">Selected:</span>
          {selectedLanguages.map((lang) => (
            <span
              key={lang}
              className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-lg"
            >
              {lang}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default LanguageSelector;
