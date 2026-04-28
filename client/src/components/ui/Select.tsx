import { forwardRef, type SelectHTMLAttributes, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  required?: boolean;
  error?: string;
  children: ReactNode;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, required, error, className = '', children, ...props }, ref) => (
    <div className={className}>
      {label && (
        <label className="form-label">
          {label}{required && <span className="text-red-500"> *</span>}
        </label>
      )}
      <div className="relative">
        <select
          ref={ref}
          {...props}
          className="form-input appearance-none pr-8 w-full cursor-pointer"
        >
          {children}
        </select>
        <ChevronDown
          size={13}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
        />
      </div>
      {error && <p className="text-red-500 text-[10px] mt-1">{error}</p>}
    </div>
  ),
);
Select.displayName = 'Select';

export default Select;
