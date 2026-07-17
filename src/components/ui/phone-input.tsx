"use client";

import { useEffect, useMemo, useState } from "react";
import {
  PhoneInput as LibPhoneInput,
  defaultCountries,
  parseCountry,
  type CountryData,
  type CountryIso2,
} from "react-international-phone";
import "react-international-phone/style.css";
import { isValidPhoneNumber } from "libphonenumber-js";
import { useExperience } from "@/components/experience-provider";
import { cn } from "@/lib/utils";
import {
  detectPhoneCountry,
  isPhoneCountry,
  storePhoneCountry,
} from "@/lib/phone";

type PhoneInputProps = {
  value: string;
  onChange: (e164: string) => void;
  id?: string;
  name?: string;
  disabled?: boolean;
  required?: boolean;
  autoFocus?: boolean;
  className?: string;
  onValidityChange?: (valid: boolean) => void;
};

const COPY = {
  en: {
    placeholder: "Phone number",
    invalid: "Enter a valid phone number",
  },
  ar: {
    placeholder: "رقم الهاتف",
    invalid: "أدخل رقم هاتف صالحًا",
  },
} as const;

function copyFor(locale: string) {
  return locale === "ar" ? COPY.ar : COPY.en;
}

function localizeCountries(locale: string): CountryData[] {
  let names: Intl.DisplayNames | null = null;
  try {
    names = new Intl.DisplayNames([locale], { type: "region" });
  } catch {
    names = null;
  }

  return defaultCountries.map((entry) => {
    const parsed = parseCountry(entry);
    const localized =
      names?.of(parsed.iso2.toUpperCase()) ?? parsed.name;
    const next = [...entry] as CountryData;
    next[0] = localized;
    return next;
  });
}

export function PhoneInput({
  value,
  onChange,
  id,
  name,
  disabled,
  required,
  autoFocus,
  className,
  onValidityChange,
}: PhoneInputProps) {
  const { locale, dir } = useExperience();
  const copy = copyFor(locale);
  const [defaultCountry, setDefaultCountry] = useState<CountryIso2>("us");
  const [ready, setReady] = useState(false);
  const [touched, setTouched] = useState(false);

  const countries = useMemo(() => localizeCountries(locale), [locale]);

  useEffect(() => {
    const detected = detectPhoneCountry().toLowerCase() as CountryIso2;
    setDefaultCountry(detected);
    setReady(true);
  }, []);

  const valid = Boolean(value) && isValidPhoneNumber(value);
  const showError = touched && value.length > 3 && !valid;

  useEffect(() => {
    onValidityChange?.(valid);
  }, [valid, onValidityChange]);

  if (!ready) {
    // Stable shell while detecting country — never a bare text input.
    return (
      <div
        className={cn(
          "react-international-phone-input-container relune-phone-input h-12 w-full animate-pulse rounded-2xl border-2 border-[var(--mist-strong)] bg-[var(--surface)]",
          className,
        )}
        dir={dir}
        aria-hidden
      />
    );
  }

  return (
    <div className={cn("relune-phone w-full", className)} dir={dir}>
      <LibPhoneInput
        defaultCountry={defaultCountry}
        value={value}
        onChange={(phone, meta) => {
          onChange(phone);
          const iso = meta.country?.iso2?.toUpperCase();
          if (iso && isPhoneCountry(iso)) {
            storePhoneCountry(iso);
          }
        }}
        countries={countries}
        preferredCountries={["il", "sa", "ae", "eg", "us", "gb", "de", "fr"]}
        forceDialCode
        disabled={disabled}
        name={name}
        required={required}
        autoFocus={autoFocus}
        placeholder={copy.placeholder}
        className={cn(
          "relune-phone-input",
          showError && "relune-phone-input--invalid",
        )}
        onBlur={() => setTouched(true)}
        inputProps={{
          id,
          autoComplete: "tel",
          "aria-invalid": showError,
        }}
        countrySelectorStyleProps={{
          buttonContentWrapperClassName: "relune-phone-flag-wrap",
        }}
      />
      {showError ? (
        <p className="mt-1.5 text-xs text-[var(--danger)]" role="alert">
          {copy.invalid}
        </p>
      ) : null}
    </div>
  );
}
