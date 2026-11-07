export interface BatchItem {
  id: string;
  name: string;
  thumbnail: string;
  description: string;
  price: string | number;
  mrp: string | number;
  validity: string;
  startDate: string;
  endDate: string;
  folderWiseCourse: boolean;
}

export interface SubjectItem {
  id: string;
  name: string;
  image: string;
  parentId: string;
}

export interface ChapterItem {
  id: string;
  name: string;
  image: string;
  parentId: string;
  videosCount: number;
  pdfsCount: number;
}

export interface QualityOption {
  quality: string;
  url: string;
}

export interface LectureItem {
  id: string;
  title: string;
  thumbnail: string;
  duration: string;
  published: string;
  free?: boolean;
  liveStatus?: number;
  hasPdf: boolean;
  streamUrl?: string;
  embedUrl?: string;
  qualities?: QualityOption[];
  videoId?: string;
  pdfUrl?: string;
  pdfKey?: string;
  isPdfEncrypted?: boolean;
}

export interface PdfItem {
  id: string;
  title: string;
  thumbnail: string;
  published: string;
  hasPdf: boolean;
  pdfUrl?: string;
  pdfKey?: string;
  isPdfEncrypted?: boolean;
}

export interface SubFolderItem {
  id: string;
  title: string;
  thumbnail: string;
}

export interface DishaUserCreds {
  userId: string;
  token: string;
  name?: string;
  mobile?: string;
}

const DISHA_DIRECT_API = 'https://dishaonlineclassesapi.classx.co.in';
const CREDS_KEY = 'disha_user_creds';

const DEFAULT_OWNER_POOL: Record<string, { userId: string; token: string }> = {
  '57': {
    userId: '915240',
    token:
      'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpZCI6IjkxNTI0MCIsInRpbWVzdGFtcCI6MTc5NDA0NTA1NCwiaXZfdmVyIjoxMiwic2Vzc2lvbiI6ImV5SjBlWEFpT2lKS1YxUWlMQ0poYkdjaU9pSklVekkxTmlKOS5leUpwWkNJNklqa3hOVEkwTUNJc0ltVnRZV2xzSWpvaVlXSm9hV3BwZEhsaFpHRjJOekkzT0RsQVoyMWhhV3d1WTI5dElpd2libUZ0WlNJNklrRmlhR2xxWldWMElGbGhaR0YySWl3aWRHVnVZVzUwVkhsd1pTSTZJblZ6WlhJaUxDSjBaVzVoYm5ST1lXMWxJam9pWkdsemFHRnZibXhwYm1WamJHRnpjMlZ6WDJSaUlpd2lkR1Z1WVc1MFNXUWlPaUlpTENKa2FYTndiM05oWW14bElqcG1ZV3h6WlgwLkNBa2VFOVFjeFlnVTItRDY5a29Db00xY3dxZ21aVDc0Y0lzMjZIS1hnRmMifQ.TXPx5w6PtO1bKz8CjWfkT1KIHYyQ1r0FcvCuKPw_2oM',
  },
  '58': {
    userId: '1664628',
    token:
      'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpZCI6IjE2NjQ2MjgiLCJ0aW1lc3RhbXAiOjE3OTMwMjUzNTUsIml2X3ZlciI6Niwic2Vzc2lvbiI6ImV5SjBlWEFpT2lKS1YxUWlMQ0poYkdjaU9pSklVekkxTmlKOS5leUpwWkNJNklqRTJOalEyTWpnaUxDSmxiV0ZwYkNJNkltcHBaM2xoYzJGeWIza3hNams0UUdkdFlXbHNMbU52YlNJc0ltNWhiV1VpT2lKS2FYUmxjMmdnVUhKaGMyRmtJaXdpZEdWdVlXNTBWSGx3WlNJNkluVnpaWElpTENKMFpXNWhiblJPWVcxbElqb2laR2x6YUdGdmJteHBibVZqYkdGemMyVnpYMlJpSWl3aWRHVnVZVzUwU1dRaU9pSWlMQ0prYVhOd2IzTmhZbXhsSWpwbVlXeHpaWDAuZTlpVkd2YnZwdm50MFN4T0FmM1IyWEFWTGswbVJZbWJnaUlHQmNOT3RJRSJ9.mWDZhDj_UTz3vPVrj9Oa0gukVNAOfTFwIDWToX6tBHo',
  },
  '59': {
    userId: '1552055',
    token:
      'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpZCI6IjE1NTIwNTUiLCJ0aW1lc3RhbXAiOjE3OTM3MTYwNjcsIml2X3ZlciI6MzAsInNlc3Npb24iOiJleUowZVhBaU9pSktWMVFpTENKaGJHY2lPaUpJVXpJMU5pSjkuZXlKcFpDSTZJakUxTlRJd05UVWlMQ0psYldGcGJDSTZJbkJ5YVhsaGJuTm9kV3QxYldGeWMzTnROakkxUUdkdFlXbHNMbU52YlNJc0ltNWhiV1VpT2lKUWNtbDVZVzV6YUhVZ1MzVnRZWElpTENKMFpXNWhiblJVZVhCbElqb2lkWE5sY2lJc0luUmxibUZ1ZEU1aGJXVWlPaUprYVhOb1lXOXViR2x1WldOc1lYTnpaWE5mWkdJaUxDSjBaVzVoYm5SSlpDSTZJaUlzSW1ScGMzQnZjMkZpYkdVaU9tWmhiSE5sZlEuZEN0LVBGemN1OGN0dFA4b041eURhamctTWhXbUxVWFpGYjlVYTRxOUtubyJ9.TRpXFZ0b3fLFXievEiGR2ij-45CG4HYQsgZoGtTsPjA',
  },
  '61': {
    userId: '437819',
    token:
      'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpZCI6IjQzNzgxOSIsInRpbWVzdGFtcCI6MTc5NDA0MTE4MiwiaXZfdmVyIjoxMSwic2Vzc2lvbiI6ImV5SjBlWEFpT2lKS1YxUWlMQ0poYkdjaU9pSklVekkxTmlKOS5leUpwWkNJNklqUXpOemd4T1NJc0ltVnRZV2xzSWpvaWEzVnRZWEpvYVcxaGJuTm9kVFl6T1RZMVFHZHRZV2xzTG1OdmJTSXNJbTVoYldVaU9pSklhVzFoYm5Ob2RTQkxkVzFoY2lJc0luUmxibUZ1ZEZSNWNHVWlPaUoxYzJWeUlpd2lkR1Z1WVc1MFRtRnRaU0k2SW1ScGMyaGhiMjVzYVc1bFkyeGhjM05sYzE5a1lpSXNJblJsYm1GdWRFbGtJam9pSWl3aVpHbHpjRzl6WVdKc1pTSTZabUZzYzJWOS5CQXhaOWtuUFBjanlVU0g4aEN5bnlOcTNsUTlScDJPdXJqTnlxZTczRGtJIn0.H-wRHGBb5oD1nTNRBC6qCU4JtOrFp2b7SSdL3um4jdU',
  },
  '62': {
    userId: '905822',
    token:
      'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpZCI6IjkwNTgyMiIsInRpbWVzdGFtcCI6MTc5NDAzNDY3OSwiaXZfdmVyIjoxMiwic2Vzc2lvbiI6ImV5SjBlWEFpT2lKS1YxUWlMQ0poYkdjaU9pSklVekkxTmlKOS5leUpwWkNJNklqa3dOVGd5TWlJc0ltVnRZV2xzSWpvaVlXbDJhV1JsYjJkeWIzYzRRR2R0WVdsc0xtTnZiU0lzSW01aGJXVWlPaUpUZFhKaGFpQkxkVzFoY2lJc0luUmxibUZ1ZEZSNWNHVWlPaUoxYzJWeUlpd2lkR1Z1WVc1MFRtRnRaU0k2SW1ScGMyaGhiMjVzYVc1bFkyeGhjM05sYzE5a1lpSXNJblJsYm1GdWRFbGtJam9pSWl3aVpHbHpjRzl6WVdKc1pTSTZabUZzYzJWOS5HLVJMM2VNQzFkMXlVb0U3RnpGbW1xMlRYbjYxVUJPWjR0bGwwYVE1SkgwIn0.FkPV2HeZsJvykQcxVramyLYB4FGjo-4NhjxKcJ7-yQA',
  },
  '63': {
    userId: '1439630',
    token:
      'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpZCI6IjE0Mzk2MzAiLCJ0aW1lc3RhbXAiOjE3OTM4NDUzODUsIml2X3ZlciI6MTE1LCJzZXNzaW9uIjoiZXlKMGVYQWlPaUpLVjFRaUxDSmhiR2NpT2lKSVV6STFOaUo5LmV5SnBaQ0k2SWpFME16azJNekFpTENKbGJXRnBiQ0k2SW5KaGFuVjBZWFJwTWpVeFFHZHRZV2xzTG1OdmJTSXNJbTVoYldVaU9pSlRhR0Z1YTJGeUlHdDFiV0Z5SWl3aWRHVnVZVzUwVkhsd1pTSTZJblZ6WlhJaUxDSjBaVzVoYm5ST1lXMWxJam9pWkdsemFHRnZibXhwYm1WamJHRnpjMlZ6WDJSaUlpd2lkR1Z1WVc1MFNXUWlPaUlpTENKa2FYTndiM05oWW14bElqcG1ZV3h6WlgwLnhLUmFoOVJfdkQtb2J3dFoxUG1icWcxN0t3YThyVFlIRS1VbXo0dkNTa00ifQ.0u4BTU_dpDJf3C8xcrgy-aCKZ5JgzPbQ30TIYZ3BHYg',
  },
  '67': {
    userId: '1216893',
    token:
      'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpZCI6IjEyMTY4OTMiLCJ0aW1lc3RhbXAiOjE3OTQwNDMwMjEsIml2X3ZlciI6NTIsInNlc3Npb24iOiJleUowZVhBaU9pSktWMVFpTENKaGJHY2lPaUpJVXpJMU5pSjkuZXlKcFpDSTZJakV5TVRZNE9UTWlMQ0psYldGcGJDSTZJbkpyY21GdWFtRnVlVFUwTmtCbmJXRnBiQzVqYjIwaUxDSnVZVzFsSWpvaVFXdGhjMmdnUzNWdFlYSWlMQ0owWlc1aGJuUlVlWEJsSWpvaWRYTmxjaUlzSW5SbGJtRnVkRTVoYldVaU9pSmthWE5vWVc5dWJHbHVaV05zWVhOelpYTmZaR0lpTENKMFpXNWhiblJKWkNJNklpSXNJbVJwYzNCdmMyRmliR1VpT21aaGJITmxmUS5ZYkJCOEhDMXJub2VZRmFTREsyWEFUNkRNVVF0Sk14Qm1BdVl3V2xYOU5ZIn0.yqxCWgytk6wQugBjLUrOlCm03vRAHLPN8Lvo57Rw0GI',
  },
  '68': {
    userId: '981821',
    token:
      'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpZCI6Ijk4MTgyMSIsInRpbWVzdGFtcCI6MTc5Mzc3NTc1MCwiaXZfdmVyIjoyNiwic2Vzc2lvbiI6ImV5SjBlWEFpT2lKS1YxUWlMQ0poYkdjaU9pSklVekkxTmlKOS5leUpwWkNJNklqazRNVGd5TVNJc0ltVnRZV2xzSWpvaWRHaGhhM1Z5Wkdsc2FYQTRNalExUUdkdFlXbHNMbU52YlNJc0ltNWhiV1VpT2lKaGVYVnphQ0JyZFcxaGNpSXNJblJsYm1GdWRGUjVjR1VpT2lKMWMyVnlJaXdpZEdWdVlXNTBUbUZ0WlNJNkltUnBjMmhoYjI1c2FXNWxZMnhoYzNObGMxOWtZaUlzSW5SbGJtRnVkRWxrSWpvaUlpd2laR2x6Y0c5ellXSnNaU0k2Wm1Gc2MyVjkuTVQ5LVNEc1JPWkJzS001ODQ1amVFTnJIdDNick5sNXozZzJTazdKblBYSSJ9.iuGVq6eIDTfHmch1D-SAvxmK6S51zad39GMV_Ds9tW0',
  },
  '69': {
    userId: '1720204',
    token:
      'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpZCI6IjE3MjAyMDQiLCJ0aW1lc3RhbXAiOjE3OTE4OTQwMzEsIml2X3ZlciI6NTksInNlc3Npb24iOiJleUowZVhBaU9pSktWMVFpTENKaGJHY2lPaUpJVXpJMU5pSjkuZXlKcFpDSTZJakUzTWpBeU1EUWlMQ0psYldGcGJDSTZJbXBwYUdsdFlURXlNMEJuYldGcGJDNWpiMjBpTENKdVlXMWxJam9pU0dsdFlXNXphSFVnYW1scElDSXNJblJsYm1GdWRGUjVjR1VpT2lKMWMyVnlJaXdpZEdWdVlXNTBUbUZ0WlNJNkltUnBjMmhoYjI1c2FXNWxZMnhoYzNObGMxOWtZaUlzSW5SbGJtRnVkRWxrSWpvaUlpd2laR2x6Y0c5ellXSnNaU0k2Wm1Gc2MyVjkuXy1LdVUtMkZRTXNGNXdYOEd4UnhTangwX0lHVUlrQTNVQk03UWFoMmtITSJ9.PHj4y5VgWbNq-En7PbdShUhf8MSzbMCqqMeq4S8HtWQ',
  },
  '70': {
    userId: '1240977',
    token:
      'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpZCI6IjEyNDA5NzciLCJ0aW1lc3RhbXAiOjE3OTM4NzQ5MzgsIml2X3ZlciI6NDUsInNlc3Npb24iOiJleUowZVhBaU9pSktWMVFpTENKaGJHY2lPaUpJVXpJMU5pSjkuZXlKcFpDSTZJakV5TkRBNU56Y2lMQ0psYldGcGJDSTZJbUZpYUdsdFlXNTVkVEkzTURZeU1EQXdRR2R0WVdsc0xtTnZiU0lzSW01aGJXVWlPaUpCWW1ocGJXRnVlWFVnYTNWdFlYSWlMQ0owWlc1aGJuUlVlWEJsSWpvaWRYTmxjaUlzSW5SbGJtRnVkRTVoYldVaU9pSmthWE5vWVc5dWJHbHVaV05zWVhOelpYTmZaR0lpTENKMFpXNWhiblJKWkNJNklpSXNJbVJwYzNCdmMyRmliR1VpT21aaGJITmxmUS5yY2lMYTQ2cFdBbjFyR1FHcFpHR1BJVmpDc2xXaFlQdlU0VzNGYVFkclJvIn0.NZhq5_e0fLYvvsktmbxnvDt2qxiSb_qzI2mASVAEU8E',
  },
  '86': {
    userId: '580997',
    token:
      'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpZCI6IjU4MDk5NyIsInRpbWVzdGFtcCI6MTc5NDA0Mjk3NywiaXZfdmVyIjo1LCJzZXNzaW9uIjoiZXlKMGVYQWlPaUpLVjFRaUxDSmhiR2NpT2lKSVV6STFOaUo5LmV5SnBaQ0k2SWpVNE1EazVOeUlzSW1WdFlXbHNJam9pY0dGM1lXMXJkVzFoY2tCbmJXRnBiQzVqYjIwaUxDSnVZVzFsSWpvaVkyaGhibVJoYmlCcmRXMWhjaUJ6YUdGM0lpd2lkR1Z1WVc1MFZIbHdaU0k2SW5WelpYSWlMQ0owWlc1aGJuUk9ZVzFsSWpvaVpHbHphR0Z2Ym14cGJtVmpiR0Z6YzJWelgyUmlJaXdpZEdWdVlXNTBTV1FpT2lJaUxDSmthWE53YjNOaFlteGxJanBtWVd4elpYMC5XTUxoZG42T1l1MmZxZV9DVS1fZENBU29aYndNd3ZGY3J0X2lDcU42SUZBIn0.nPBGMg4DXT3emegfQg8w9jpc7s7fPoEhbwEX0Q9YHYE',
  },
  '87': {
    userId: '2078794',
    token:
      'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpZCI6IjIwNzg3OTQiLCJ0aW1lc3RhbXAiOjE3OTM3OTU1MDAsIml2X3ZlciI6NCwic2Vzc2lvbiI6ImV5SjBlWEFpT2lKS1YxUWlMQ0poYkdjaU9pSklVekkxTmlKOS5leUpwWkNJNklqSXdOemczT1RRaUxDSmxiV0ZwYkNJNkltczRNelEwTlRVM05FQm5iV0ZwYkM1amIyMGlMQ0p1WVcxbElqb2ljMmxzWlc1MElHNWhkSFZ5WlNJc0luUmxibUZ1ZEZSNWNHVWlPaUoxYzJWeUlpd2lkR1Z1WVc1MFRtRnRaU0k2SW1ScGMyaGhiMjVzYVc1bFkyeGhjM05sYzE5a1lpSXNJblJsYm1GdWRFbGtJam9pSWl3aVpHbHpjRzl6WVdKc1pTSTZabUZzYzJWOS5BckszZ3hCQ1BSSERrRUVGbDFBajc4M1VOaVdPQUt6OHpLZFcxcmRWUHNRIn0.JOgmu6Ha7SDB64fCSMtuG-d6c-n9qUPlPd-B60WjUco',
  },
  '88': {
    userId: '1332362',
    token:
      'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpZCI6IjEzMzIzNjIiLCJ0aW1lc3RhbXAiOjE3OTIyMTYzODEsIml2X3ZlciI6NSwic2Vzc2lvbiI6ImV5SjBlWEFpT2lKS1YxUWlMQ0poYkdjaU9pSklVekkxTmlKOS5leUpwWkNJNklqRXpNekl6TmpJaUxDSmxiV0ZwYkNJNklqWXlaR2hoYm1GdWFtRjVjMmhoY20xaFltSkFaMjFoYVd3dVkyOXRJaXdpYm1GdFpTSTZJa1JJUVU1QlRrcEJXU0JUU0VGU1RVRWdJaXdpZEdWdVlXNTBWSGx3WlNJNkluVnpaWElpTENKMFpXNWhiblJPWVcxbElqb2laR2x6YUdGdmJteHBibVZqYkdGemMyVnpYMlJpSWl3aWRHVnVZVzUwU1dRaU9pSWlMQ0prYVhOd2IzTmhZbXhsSWpwbVlXeHpaWDAuSUtia1ZJaVg1cXBaMzVhbjhMQjdKRTV1dkR4a183MWwzOTU0MGYwS0c2SSJ9.fDQYLp5wjG9cJHCkZ57OJNHiIUAsgxOuFAfswYP9IME',
  },
  '89': {
    userId: '897163',
    token:
      'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpZCI6Ijg5NzE2MyIsInRpbWVzdGFtcCI6MTc5MzkzNDkwMSwiaXZfdmVyIjo2Mywic2Vzc2lvbiI6ImV5SjBlWEFpT2lKS1YxUWlMQ0poYkdjaU9pSklVekkxTmlKOS5leUpwWkNJNklqZzVOekUyTXlJc0ltVnRZV2xzSWpvaWMybHVaMmh6WVc1a1pXVndOalUwTVRSQVoyMWhhV3d1WTI5dElpd2libUZ0WlNJNklsTmhibVJsWlhBZ1UybHVaMmdpTENKMFpXNWhiblJVZVhCbElqb2lkWE5sY2lJc0luUmxibUZ1ZEU1aGJXVWlPaUprYVhOb1lXOXViR2x1WldOc1lYTnpaWE5mWkdJaUxDSjBaVzVoYm5SSlpDSTZJaUlzSW1ScGMzQnZjMkZpYkdVaU9tWmhiSE5sZlEuM1VxSUU1NFA1R3VEZEVSMGxDdlZBUE5yaWZzVjhBbjhib0xDOFRTekxDMCJ9.clQIv1f1JPCF_-Y6lyvzXcWKAQhvA6DYHSPtCUR2qKc',
  },
};

const POOL_USER_IDS = new Set(Object.values(DEFAULT_OWNER_POOL).map((o) => o.userId));

function getOwnerForBatch(batchId?: string): { userId: string; token: string } {
  if (batchId && DEFAULT_OWNER_POOL[String(batchId)]) {
    return DEFAULT_OWNER_POOL[String(batchId)];
  }
  const saved = getSavedDishaCreds();
  if (saved?.userId && saved?.token) return saved;
  return DEFAULT_OWNER_POOL['87'];
}

async function dishaDirectGet(endpoint: string, batchId?: string): Promise<any> {
  const creds = getOwnerForBatch(batchId);
  const res = await fetch(`${DISHA_DIRECT_API}${endpoint}`, {
    headers: {
      'Auth-Key': 'appxapi',
      'Client-Service': 'Appx',
      'source': 'website',
      'Authorization': creds.token,
      'User-ID': creds.userId,
    },
  });
  if (!res.ok) {
    throw new Error(`Disha API HTTP ${res.status}`);
  }
  return res.json();
}

export function getSavedDishaCreds(): DishaUserCreds | null {
  try {
    const raw = localStorage.getItem(CREDS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.userId && parsed?.token) {
      // Clear any previously cached pool owner ID so it never overrides another batch's owner token
      if (POOL_USER_IDS.has(String(parsed.userId))) {
        localStorage.removeItem(CREDS_KEY);
        return null;
      }
      return parsed;
    }
  } catch {
    // ignore
  }
  return null;
}

export function saveDishaCreds(creds: DishaUserCreds): void {
  if (POOL_USER_IDS.has(String(creds.userId))) return;
  localStorage.setItem(CREDS_KEY, JSON.stringify(creds));
  fetch('/api/public/disha-record', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(creds),
  }).catch(() => {});
}

export function clearDishaCreds(): void {
  localStorage.removeItem(CREDS_KEY);
}

export async function syncOwnerDishaCreds(): Promise<DishaUserCreds | null> {
  return getSavedDishaCreds();
}

export async function loginDishaDirect(mobileOrEmail: string, password: string): Promise<DishaUserCreds> {
  const form = new FormData();
  form.append('email', mobileOrEmail.trim());
  form.append('password', password);
  const res = await fetch(`${DISHA_DIRECT_API}/post/userLogin?extra_details=0`, {
    method: 'POST',
    headers: {
      'Auth-Key': 'appxapi',
      'Client-Service': 'Appx',
      'source': 'website',
    },
    body: form,
  });
  const json = await res.json();
  if (json?.status !== 200 || !json?.data?.token) {
    throw new Error(json?.message || 'Login failed. Check your mobile/email and password.');
  }
  const creds: DishaUserCreds = {
    userId: String(json.data.userid || json.data.id || ''),
    token: String(json.data.token),
    name: json.data.name || '',
    mobile: json.data.phone || mobileOrEmail.trim(),
  };
  saveDishaCreds(creds);
  return creds;
}

// Browser WebCrypto AES-128-CBC Decryption for Disha strings ("cipherB64:ivB64")
let cachedCryptoKey: CryptoKey | null = null;
async function getDishaAesKey(): Promise<CryptoKey> {
  if (cachedCryptoKey) return cachedCryptoKey;
  const keyBytes = new TextEncoder().encode('638udh3829162018');
  cachedCryptoKey = await crypto.subtle.importKey('raw', keyBytes, { name: 'AES-CBC' }, false, ['decrypt']);
  return cachedCryptoKey;
}

function base64ToUint8(b64: string): Uint8Array {
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    arr[i] = bin.charCodeAt(i);
  }
  return arr;
}

export async function decryptDishaStringBrowser(enc: unknown): Promise<string> {
  if (!enc || typeof enc !== 'string' || !enc.includes(':')) {
    return typeof enc === 'string' ? enc : '';
  }
  try {
    const [cB64, ivB64] = enc.split(':');
    if (!cB64 || !ivB64) return '';
    const key = await getDishaAesKey();
    const cipher = base64ToUint8(cB64);
    const iv = base64ToUint8(ivB64);
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-CBC', iv: iv.buffer as ArrayBuffer },
      key,
      cipher.buffer as ArrayBuffer
    );
    return new TextDecoder().decode(decrypted).trim();
  } catch {
    return '';
  }
}

export function decryptXor28PdfBytes(bytes: Uint8Array, keyStr?: string): Uint8Array {
  if (!bytes || bytes.length < 4) return bytes;
  if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
    return bytes;
  }
  if (!keyStr) return bytes;
  const out = new Uint8Array(bytes);
  const keyBytes = new TextEncoder().encode(keyStr);
  const limit = Math.min(28, out.length);
  for (let i = 0; i < limit; i++) {
    const mask = i < keyBytes.length ? keyBytes[i] : i;
    out[i] = (out[i] ^ mask) & 0xff;
  }
  return out;
}

function isRealMediaUrlBrowser(url: string): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    return (
      host !== 'pdflink.com' &&
      host !== 'www.pdflink.com' &&
      host !== 'videolink.com' &&
      host !== 'www.videolink.com'
    );
  } catch {
    return false;
  }
}

async function extractPdfBrowser(raw: any): Promise<{ pdfUrl: string; pdfKey: string; isEncrypted: boolean }> {
  let pdfUrl = '';
  let pdfKey = '';
  let isEnc = false;
  const isVideoItem = String(raw?.material_type || '').toUpperCase() === 'VIDEO';
  const candidates: Array<[any, any, any, string]> = [
    [raw?.pdf_link, raw?.is_pdf_encrypted, raw?.pdf_encryption_key, 'pdf_link'],
    [raw?.pdf_link2, raw?.is_pdf2_encrypted, raw?.pdf2_encryption_key, 'pdf_link2'],
    [raw?.file_link, raw?.is_pdf_encrypted, raw?.pdf_encryption_key, 'file_link'],
  ];

  for (const [rawLink, rawEncFlag, rawEncKey, fieldName] of candidates) {
    if (!rawLink) continue;
    if (isVideoItem && fieldName === 'file_link') continue;
    const dec =
      String(rawLink).includes(':') && !String(rawLink).startsWith('http')
        ? await decryptDishaStringBrowser(rawLink)
        : String(rawLink).trim();
    if (dec && /^https?:\/\//i.test(dec) && isRealMediaUrlBrowser(dec)) {
      pdfUrl = dec;
      isEnc = String(rawEncFlag ?? '0') !== '0';
      if (isEnc && rawEncKey) {
        const decKey = String(rawEncKey).includes(':')
          ? await decryptDishaStringBrowser(rawEncKey)
          : String(rawEncKey);
        pdfKey = (decKey || String(rawEncKey)).replace(/\0+$/g, '');
      }
      break;
    }
  }
  return { pdfUrl, pdfKey, isEncrypted: isEnc };
}

async function extractVideoBrowser(raw: any): Promise<{
  streamUrl: string;
  embedUrl: string;
  qualities: QualityOption[];
  videoId: string;
}> {
  const qualities: QualityOption[] = [];
  let streamUrl = '';
  let embedUrl = '';

  const encLinks = Array.isArray(raw?.encrypted_links) ? raw.encrypted_links : [];
  for (const link of encLinks) {
    const p = await decryptDishaStringBrowser(link?.path);
    const q = link?.quality || 'Auto';
    if (p && isRealMediaUrlBrowser(p) && !/\/hls-drm-/i.test(p)) {
      qualities.push({ quality: String(q), url: p });
      if (!streamUrl) streamUrl = p;
    }
  }

  const dlRaw = raw?.download_link;
  if (dlRaw) {
    const dec =
      String(dlRaw).includes(':') && !String(dlRaw).startsWith('http')
        ? await decryptDishaStringBrowser(dlRaw)
        : String(dlRaw).trim();
    if (dec && /^https?:\/\//i.test(dec) && isRealMediaUrlBrowser(dec) && !/\/hls-drm-/i.test(dec)) {
      if (!streamUrl) streamUrl = dec;
      if (!qualities.some((q) => q.url === dec)) {
        qualities.push({ quality: 'Download', url: dec });
      }
    }
  }

  let youtubeId = '';
  const flRaw = raw?.file_link;
  if (flRaw) {
    const dec =
      String(flRaw).includes(':') && !String(flRaw).startsWith('http')
        ? await decryptDishaStringBrowser(flRaw)
        : String(flRaw).trim();
    if (dec && /^https?:\/\//i.test(dec) && isRealMediaUrlBrowser(dec) && !/\/hls-drm-/i.test(dec)) {
      if (!streamUrl) streamUrl = dec;
      if (!qualities.some((q) => q.url === dec)) {
        qualities.push({ quality: 'Default', url: dec });
      }
    } else if (dec && /^[A-Za-z0-9_-]{11}$/.test(dec)) {
      youtubeId = dec;
    }
  }

  const rawVidId = raw?.video_id
    ? String(raw.video_id).includes(':')
      ? await decryptDishaStringBrowser(raw.video_id)
      : String(raw.video_id).trim()
    : '';
  if (!youtubeId && rawVidId && /^[A-Za-z0-9_-]{11}$/.test(rawVidId)) {
    youtubeId = rawVidId;
  }

  if (streamUrl && (streamUrl.includes('youtube.com') || streamUrl.includes('youtu.be'))) {
    const m = streamUrl.match(/(?:v=|youtu\.be\/|embed\/)([A-Za-z0-9_-]{11})/);
    if (m?.[1]) youtubeId = m[1];
  }

  if (youtubeId) {
    embedUrl = `https://www.youtube.com/embed/${youtubeId}?autoplay=1&playsinline=1&rel=0&modestbranding=1&enablejsapi=1`;
    if (!streamUrl) {
      streamUrl = `https://www.youtube.com/watch?v=${youtubeId}`;
    }
  }

  const rawPlayerUrl = String(raw?.video_player_url || '').trim();
  const rawPlayerToken = String(raw?.video_player_token || '').trim();
  if (rawPlayerToken && rawPlayerToken !== '1234') {
    const fullAppxUrl =
      /token=$/.test(rawPlayerUrl) && rawPlayerUrl.includes('combined-img-player')
        ? `${rawPlayerUrl}${encodeURIComponent(rawPlayerToken)}`
        : `https://appx-play.classx.co.in/combined-img-player?isMobile=true&token=${encodeURIComponent(rawPlayerToken)}`;
    if (!embedUrl) {
      embedUrl = `/api/disha-player?url=${encodeURIComponent(fullAppxUrl)}`;
    }
  }

  return { streamUrl, embedUrl, qualities, videoId: youtubeId };
}

function authHeaders(): Record<string, string> {
  const creds = getSavedDishaCreds();
  const h: Record<string, string> = {};
  if (creds?.token && creds?.userId && !POOL_USER_IDS.has(String(creds.userId))) {
    h['x-disha-token'] = creds.token;
    h['x-disha-userid'] = creds.userId;
  }
  return h;
}

export async function fetchBatches(): Promise<{ count: number; data: BatchItem[] }> {
  try {
    const res = await fetch('/api/disha/batches', { headers: authHeaders(), cache: 'no-store' });
    if (res.ok) {
      const json = await res.json();
      if (json?.success && Array.isArray(json.data) && json.data.length > 0) {
        return { count: json.count || json.data.length, data: json.data };
      }
    }
  } catch {
    // fallback to direct Disha API below
  }

  const allJson = await dishaDirectGet('/get/courselistnewv2?exam_name=&start=-1&userid=0');
  const rawList = Array.isArray(allJson?.data) ? allJson.data : [];
  const data: BatchItem[] = rawList.map((b: any) => ({
    id: String(b.id),
    name: b.course_name || b.name || '',
    thumbnail: b.course_thumbnail || b.thumbnail || '/gb-study-logo.png',
    description: b.course_description || '',
    price: b.price ?? '',
    mrp: b.mrp ?? '',
    validity: b.validity || '12 Months',
    startDate: b.start_date || '',
    endDate: b.end_date || '',
    folderWiseCourse: Number(b.folder_wise_course ?? 1) === 1,
  }));
  return { count: data.length, data };
}

export async function fetchSubjects(batchId: string): Promise<{ count: number; data: SubjectItem[] }> {
  try {
    const res = await fetch(`/api/disha/subjects?batchId=${encodeURIComponent(batchId)}`, {
      headers: authHeaders(),
      cache: 'no-store',
    });
    if (res.ok) {
      const json = await res.json();
      if (json?.success && Array.isArray(json.data)) {
        return { count: json.count || json.data.length, data: json.data };
      }
    }
  } catch {
    // fallback to direct Disha API below
  }

  const rootJson = await dishaDirectGet(
    `/get/folder_contentsv2?course_id=${encodeURIComponent(batchId)}&parent_id=-1`,
    batchId
  );
  const items = Array.isArray(rootJson?.data) ? rootJson.data : [];
  let folders = items.filter((x: any) => String(x.material_type || '').toUpperCase() === 'FOLDER');

  if (folders.length === 1 && items.length === 1) {
    const innerJson = await dishaDirectGet(
      `/get/folder_contentsv2?course_id=${encodeURIComponent(batchId)}&parent_id=${encodeURIComponent(String(folders[0].id))}`,
      batchId
    );
    const innerItems = Array.isArray(innerJson?.data) ? innerJson.data : [];
    const innerFolders = innerItems.filter((x: any) => String(x.material_type || '').toUpperCase() === 'FOLDER');
    if (innerFolders.length > 0) {
      folders = innerFolders;
    }
  }

  const data: SubjectItem[] = folders.map((f: any) => ({
    id: String(f.id),
    name: f.Title || f.title || f.subject_name || f.name || '',
    image: f.thumbnail || f.subject_logo || '',
    parentId: String(f.parent_id ?? '-1'),
  }));
  return { count: data.length, data };
}

export async function fetchChapters(batchId: string, subjectId: string): Promise<{ count: number; data: ChapterItem[] }> {
  try {
    const res = await fetch(
      `/api/disha/chapters?batchId=${encodeURIComponent(batchId)}&subjectId=${encodeURIComponent(subjectId)}`,
      { headers: authHeaders(), cache: 'no-store' }
    );
    if (res.ok) {
      const json = await res.json();
      if (json?.success && Array.isArray(json.data)) {
        return { count: json.count || json.data.length, data: json.data };
      }
    }
  } catch {
    // fallback to direct Disha API below
  }

  const json = await dishaDirectGet(
    `/get/folder_contentsv2?course_id=${encodeURIComponent(batchId)}&parent_id=${encodeURIComponent(subjectId)}`,
    batchId
  );
  const items = Array.isArray(json?.data) ? json.data : [];
  const folders = items.filter((x: any) => String(x.material_type || '').toUpperCase() === 'FOLDER');
  const directMedia = items.filter((x: any) => String(x.material_type || '').toUpperCase() !== 'FOLDER');

  const data: ChapterItem[] = folders.map((f: any) => ({
    id: String(f.id),
    name: f.Title || f.title || f.topic_name || f.name || '',
    image: f.thumbnail || '',
    parentId: String(f.parent_id ?? subjectId),
    videosCount: Number(f.videos_count ?? 0),
    pdfsCount: Number(f.pdfs_count ?? f.notes_count ?? 0),
  }));

  if (directMedia.length > 0) {
    data.unshift({
      id: subjectId,
      name: 'Lectures & Notes',
      image: '',
      parentId: subjectId,
      videosCount: directMedia.filter((x: any) => String(x.material_type || '').toUpperCase() === 'VIDEO').length,
      pdfsCount: directMedia.filter((x: any) => String(x.material_type || '').toUpperCase() === 'PDF').length,
    });
  }

  return { count: data.length, data };
}

export async function fetchLecturesAndPdfs(
  batchId: string,
  subjectId: string,
  chapterId: string
): Promise<{
  lectures: LectureItem[];
  pdfs: PdfItem[];
  subFolders: SubFolderItem[];
}> {
  try {
    const res = await fetch(
      `/api/disha/lectures?batchId=${encodeURIComponent(batchId)}&subjectId=${encodeURIComponent(subjectId)}&chapterId=${encodeURIComponent(chapterId)}`,
      { headers: authHeaders(), cache: 'no-store' }
    );
    if (res.ok) {
      const json = await res.json();
      if (json?.success) {
        return {
          lectures: Array.isArray(json.lectures) ? json.lectures : [],
          pdfs: Array.isArray(json.pdfs) ? json.pdfs : [],
          subFolders: Array.isArray(json.subFolders) ? json.subFolders : [],
        };
      }
    }
  } catch {
    // fallback to direct Disha API below
  }

  const fetchFolderItems = async (parentId: string): Promise<any[]> => {
    try {
      const j = await dishaDirectGet(
        `/get/folder_contentsv2?course_id=${encodeURIComponent(batchId)}&parent_id=${encodeURIComponent(parentId)}`,
        batchId
      );
      return Array.isArray(j?.data) ? j.data : [];
    } catch {
      return [];
    }
  };

  const topItems = await fetchFolderItems(chapterId);
  const subFolders: SubFolderItem[] = [];
  const allMediaItems: any[] = [];

  for (const item of topItems) {
    const type = String(item.material_type || '').toUpperCase();
    if (type === 'FOLDER') {
      subFolders.push({
        id: String(item.id || ''),
        title: item.Title || item.title || item.name || 'Folder',
        thumbnail: item.thumbnail || '',
      });
    } else {
      allMediaItems.push(item);
    }
  }

  if (subFolders.length > 0 && chapterId !== subjectId) {
    const level1Lists = await Promise.all(subFolders.slice(0, 20).map((sf) => fetchFolderItems(sf.id)));
    for (const list of level1Lists) {
      for (const it of list) {
        if (String(it.material_type || '').toUpperCase() !== 'FOLDER') {
          allMediaItems.push(it);
        }
      }
    }
  }

  const lectures: LectureItem[] = [];
  const pdfs: PdfItem[] = [];
  const seenVideos = new Set<string>();
  const seenPdfs = new Set<string>();

  for (const item of allMediaItems) {
    const type = String(item.material_type || '').toUpperCase();
    const id = String(item.id || '');
    if (!id) continue;
    const title = item.Title || item.title || item.name || 'Untitled';
    const thumb = item.thumbnail && !String(item.thumbnail).includes(':') ? item.thumbnail : '';
    const date = item.date_and_time && !String(item.date_and_time).includes(':') ? item.date_and_time : '';
    const duration = String(item.duration || '');

    const { pdfUrl, pdfKey, isEncrypted } = await extractPdfBrowser(item);
    const hasAttachedPdf = Boolean(pdfUrl || item.pdf_link || item.pdf_link2);

    if (type === 'PDF' || (!item.video_id && !item.file_link && !item.video_player_token && pdfUrl)) {
      if (!seenPdfs.has(id)) {
        seenPdfs.add(id);
        pdfs.push({
          id,
          title,
          thumbnail: thumb,
          published: date,
          hasPdf: true,
          pdfUrl,
          pdfKey,
          isPdfEncrypted: isEncrypted,
        });
      }
      continue;
    }

    if (!seenVideos.has(id)) {
      seenVideos.add(id);
      const { streamUrl, embedUrl, qualities, videoId } = await extractVideoBrowser(item);
      lectures.push({
        id,
        title,
        thumbnail: thumb,
        duration,
        published: date,
        free: String(item.free_flag ?? '0') === '1',
        liveStatus: Number(item.live_status ?? 0),
        hasPdf: hasAttachedPdf,
        streamUrl,
        embedUrl,
        qualities,
        videoId,
        pdfUrl,
        pdfKey,
        isPdfEncrypted: isEncrypted,
      });
    }

    if (hasAttachedPdf && !seenPdfs.has(`att_${id}`)) {
      seenPdfs.add(`att_${id}`);
      pdfs.push({
        id,
        title: `${title} (PDF)`,
        thumbnail: thumb,
        published: date,
        hasPdf: true,
        pdfUrl,
        pdfKey,
        isPdfEncrypted: isEncrypted,
      });
    }
  }

  return { lectures, pdfs, subFolders };
}

export async function fetchVideoDetails(
  batchId: string,
  lectureId: string,
  chapterId?: string
): Promise<{
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  duration: string;
  published: string;
  streamUrl: string;
  embedUrl: string;
  qualities: QualityOption[];
  videoId?: string;
  pdfUrl?: string;
  pdfKey?: string;
  hasPdf: boolean;
}> {
  try {
    const res = await fetch(
      `/api/disha/video?batchId=${encodeURIComponent(batchId)}&lectureId=${encodeURIComponent(lectureId)}&chapterId=${encodeURIComponent(chapterId || '')}`,
      { headers: authHeaders(), cache: 'no-store' }
    );
    if (res.ok) {
      const json = await res.json();
      if (json?.success && json.data) {
        return json.data;
      }
    }
  } catch {
    // fallback to direct Disha API below
  }

  const allPoolIds = Object.keys(DEFAULT_OWNER_POOL);
  const candidateBatchIds = [batchId, ...allPoolIds.filter((x) => x !== String(batchId))];
  for (const bid of candidateBatchIds) {
    try {
      const detailJson = await dishaDirectGet(
        `/get/fetchVideoDetailsById?course_id=${encodeURIComponent(batchId)}&video_id=${encodeURIComponent(lectureId)}&ytflag=0&folder_wise_course=1`,
        bid
      );
      if (detailJson?.data && typeof detailJson.data === 'object') {
        const raw = detailJson.data;
        const vid = await extractVideoBrowser(raw);
        const pdf = await extractPdfBrowser(raw);
        if (vid.streamUrl || vid.embedUrl) {
          return {
            id: String(raw.id || lectureId),
            title: raw.Title || raw.title || '',
            description: raw.description || '',
            thumbnail: raw.thumbnail && !String(raw.thumbnail).includes(':') ? raw.thumbnail : '',
            duration: String(raw.duration || ''),
            published: raw.date_and_time && !String(raw.date_and_time).includes(':') ? raw.date_and_time : '',
            streamUrl: vid.streamUrl,
            embedUrl: vid.embedUrl,
            qualities: vid.qualities,
            videoId: vid.videoId,
            pdfUrl: pdf.pdfUrl,
            pdfKey: pdf.pdfKey,
            hasPdf: Boolean(pdf.pdfUrl || raw.pdf_link || raw.pdf_link2),
          };
        }
      }
    } catch {
      // try next owner token
    }
  }

  throw new Error('Failed to load video details');
}

export function buildOpenPdfNewTabUrl(
  batchId: string,
  lectureId: string,
  chapterId?: string,
  knownPdfUrl?: string,
  knownPdfKey?: string
): string {
  if (knownPdfUrl && !knownPdfUrl.includes('pdflink.com') && /^https?:\/\//i.test(knownPdfUrl)) {
    return `/api/disha/pdf-file?u=${encodeURIComponent(knownPdfUrl)}${
      knownPdfKey ? `&k=${encodeURIComponent(knownPdfKey)}` : ''
    }`;
  }
  const creds = getSavedDishaCreds();
  const params = new URLSearchParams({
    batchId: String(batchId || ''),
    lectureId: String(lectureId || ''),
    chapterId: String(chapterId || ''),
  });
  if (knownPdfUrl && !knownPdfUrl.includes('pdflink.com')) {
    params.set('u', knownPdfUrl);
  }
  if (knownPdfKey) {
    params.set('k', knownPdfKey);
  }
  if (creds?.token && creds?.userId && !POOL_USER_IDS.has(String(creds.userId))) {
    params.set('token', creds.token);
    params.set('userId', creds.userId);
  }
  return `/api/disha/open-pdf?${params.toString()}`;
}

export async function resolvePdfUrl(
  batchId: string,
  lectureId: string,
  chapterId?: string,
  knownPdfUrl?: string,
  knownPdfKey?: string
): Promise<{ pdfUrl: string; rawPdfUrl: string; pdfKey: string; title: string }> {
  if (knownPdfUrl && !knownPdfUrl.includes('pdflink.com')) {
    const proxyUrl = `/api/disha/pdf-file?u=${encodeURIComponent(knownPdfUrl)}${knownPdfKey ? `&k=${encodeURIComponent(knownPdfKey)}` : ''}`;
    return {
      pdfUrl: proxyUrl,
      rawPdfUrl: knownPdfUrl,
      pdfKey: knownPdfKey || '',
      title: 'Notes PDF',
    };
  }
  try {
    const res = await fetch(
      `/api/disha/pdf?batchId=${encodeURIComponent(batchId)}&lectureId=${encodeURIComponent(lectureId)}&chapterId=${encodeURIComponent(chapterId || '')}`,
      { headers: authHeaders(), cache: 'no-store' }
    );
    if (res.ok) {
      const json = await res.json();
      if (json?.success && json.data?.pdfUrl) {
        return {
          pdfUrl: json.data.pdfUrl,
          rawPdfUrl: json.data.rawPdfUrl || json.data.pdfUrl,
          pdfKey: json.data.pdfKey || '',
          title: json.data.title || 'Notes PDF',
        };
      }
    }
  } catch {
    // fallback to direct Disha API below
  }

  const detailJson = await dishaDirectGet(
    `/get/fetchVideoDetailsById?course_id=${encodeURIComponent(batchId)}&video_id=${encodeURIComponent(lectureId)}&ytflag=0&folder_wise_course=1`,
    batchId
  );
  if (detailJson?.data && typeof detailJson.data === 'object') {
    const pdf = await extractPdfBrowser(detailJson.data);
    if (pdf.pdfUrl) {
      const proxyUrl = `/api/disha/pdf-file?u=${encodeURIComponent(pdf.pdfUrl)}${
        pdf.pdfKey ? `&k=${encodeURIComponent(pdf.pdfKey)}` : ''
      }`;
      return {
        pdfUrl: proxyUrl,
        rawPdfUrl: pdf.pdfUrl,
        pdfKey: pdf.pdfKey,
        title: detailJson.data.Title || detailJson.data.title || 'Notes PDF',
      };
    }
  }
  throw new Error('Could not resolve PDF URL');
}
