import { http, HttpResponse } from 'msw';
import okBasic from '../../../../contract/fixtures/ok_basic.json';
import errSemantic from '../../../../contract/fixtures/err_semantic.json';
import errSyntactic from '../../../../contract/fixtures/err_syntactic.json';

export const handlers = [
  http.get('/api/health', () => {
    return HttpResponse.json({ status: 'ok' });
  }),

  http.post('/api/compile', async ({ request }) => {
    const body = (await request.json()) as { source?: string };
    const src = body.source || '';

    if (src.includes('+ 2') || src.includes('+2')) {
      return HttpResponse.json(errSyntactic);
    }
    if (src.includes('d')) {
      return HttpResponse.json(errSemantic);
    }
    return HttpResponse.json(okBasic);
  }),
];
