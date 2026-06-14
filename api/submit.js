import { Redis } from '@upstash/redis';

// Vercel ortam değişkenlerinden (UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN)
// otomatik bağlanır. Bu değişkenleri Vercel > Storage > Upstash Redis bağlantısı ekler.
const redis = Redis.fromEnv();

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Yalnızca POST desteklenir.' });
  }

  try {
    const data = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});

    // Zorunlu temel alan kontrolü (talep eden iletişim bilgisi)
    if (!data.talep_ad && !data.sig_ad) {
      return res.status(400).json({ error: 'Başvuru verisi eksik.' });
    }

    const now = new Date();
    const id = `basvuru:${now.getTime()}`;

    const record = {
      ...data,
      _id: id,
      _olusturma: now.toISOString(),
      _ip: (req.headers['x-forwarded-for'] || '').split(',')[0].trim(),
    };

    // Başvuruyu hash olarak sakla, listeye en yeni en başta olacak şekilde ekle
    await redis.hset(id, record);
    await redis.lpush('basvurular', id);

    return res.status(200).json({ ok: true, id });
  } catch (err) {
    console.error('Başvuru kayıt hatası:', err);
    return res.status(500).json({ error: 'Başvuru kaydedilemedi.' });
  }
}
