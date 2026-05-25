/** iOS App Group — must match app.config.js entitlements and targets/widget Swift. */
export const WIDGET_APP_GROUP = 'group.com.yourname.dumpitapp.widgets';

export const WIDGET_STORAGE_KEYS = {
  activeId: 'pd_active_widget_id',
  activeCaption: 'pd_active_caption',
  activeKind: 'pd_active_widget_kind',
  activePreviewB64: 'pd_active_preview_b64',
  manifest: 'pd_widget_manifest',
} as const;
