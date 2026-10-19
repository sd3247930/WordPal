export type WordbookViewScope='current'|'all'
export const wordbookScopeIcons={
 current:{src:'/static/icons/wordbook-scopes/wordpal_scope_current_textbook_256.png',fallback:'▤'},
 all:{src:'/static/icons/wordbook-scopes/wordpal_scope_installed_textbooks_256.png',fallback:'▥'},
 learned:{src:'/static/icons/wordbook-scopes/wordpal_scope_global_learned_256.png',fallback:'★'}
} as const
