// Emails and passwords are Latin text: keep them left-to-right inside the RTL page (NAB-137).
// Pass as a TextField's inputProps.
export const ltrInput = { dir: 'ltr' as const, style: { textAlign: 'left' as const } };
