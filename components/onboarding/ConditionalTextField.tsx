import { TextField } from "@/components/common/TextField";

type ConditionalTextFieldProps = {
  visible: boolean;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  label?: string;
};

export function ConditionalTextField({
  visible,
  value,
  onChangeText,
  placeholder,
  label,
}: ConditionalTextFieldProps): JSX.Element | null {
  if (!visible) return null;

  return (
    <TextField
      label={label}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      autoCapitalize="sentences"
    />
  );
}
