import {Linking} from 'react-native';
import type {Locale} from '../i18n/locale';

export function whatsAppLink(phone: string, text: string): string | null {
  const digits = phone.replace(/\D/g, '');
  const local =
    digits.length === 10 ? `91${digits}` : digits.length === 12 && digits.startsWith('91') ? digits : '';
  if (!local) {
    return null;
  }
  return `https://wa.me/${local}?text=${encodeURIComponent(text)}`;
}

export function dueText(locale: Locale, name: string, amountLabel: string): string {
  if (locale === 'en') {
    return `Hello ${name}, your pending amount in Maza Hishob is ${amountLabel}. Please pay when you can.`;
  }
  return `नमस्कार ${name}, माझा हिशोब: तुमची बाकी ${amountLabel} आहे. सोयीने जमा करा.`;
}

export function paidText(locale: Locale, name: string, amountLabel: string): string {
  if (locale === 'en') {
    return `Hello ${name}, we received ${amountLabel}. Thank you. — Maza Hishob`;
  }
  return `नमस्कार ${name}, ${amountLabel} जमा झाले. धन्यवाद. — माझा हिशोब`;
}

export async function openWhatsApp(phone: string, text: string): Promise<boolean> {
  const url = whatsAppLink(phone, text);
  if (!url) {
    return false;
  }
  await Linking.openURL(url);
  return true;
}
