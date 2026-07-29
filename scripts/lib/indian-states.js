// Lowercase Indian state/UT names, in the phrasing they tend to appear as in
// MoEF notification text (with "and" rather than "&", full official forms).
export const INDIAN_STATE_AND_UT_NAMES = [
  'andhra pradesh', 'arunachal pradesh', 'assam', 'bihar', 'chhattisgarh', 'chattisgarh',
  'goa', 'gujarat', 'haryana', 'himachal pradesh', 'jharkhand', 'karnataka', 'kerala',
  'madhya pradesh', 'maharashtra', 'manipur', 'meghalaya', 'mizoram', 'nagaland', 'odisha',
  'punjab', 'rajasthan', 'sikkim', 'tamil nadu', 'telangana', 'tripura', 'uttar pradesh',
  'uttarakhand', 'west bengal', 'andaman and nicobar islands', 'andaman and nicobar',
  'jammu and kashmir', 'ladakh', 'delhi', 'national capital territory of delhi',
  'chandigarh', 'dadra and nagar haveli and daman and diu', 'dadra and nagar haveli',
  'dadra nagar haveli', 'daman and diu', 'puducherry', 'lakshadweep',
];

// State/UT (and similar) proper nouns that themselves contain " and " -- must
// never be split on that "and" when parsing multi-park notification text.
export const PROTECTED_AND_PHRASES = [
  'dadra and nagar haveli and daman and diu',
  'dadra and nagar haveli',
  'daman and diu',
  'jammu and kashmir',
  'andaman and nicobar',
];
