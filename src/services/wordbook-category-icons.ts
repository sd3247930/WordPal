import type {WordbookFilter} from '../stores/wordbook'

export const wordbookCategoryIcons:Record<WordbookFilter,{src:string;fallback:string}>={
 due:{src:'/static/icons/wordbook-categories/wordpal_wordbook_due_review_256.png',fallback:'↻'},
 weak:{src:'/static/icons/wordbook-categories/wordpal_wordbook_key_review_256.png',fallback:'★'},
 mistakes:{src:'/static/icons/wordbook-categories/wordpal_wordbook_wrong_words_256.png',fallback:'✎'},
 all:{src:'/static/icons/wordbook-categories/wordpal_wordbook_all_words_256.png',fallback:'▤'}
}
