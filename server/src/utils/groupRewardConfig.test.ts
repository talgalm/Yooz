import assert from 'node:assert';
import { cloudinaryAttachmentUrl } from './groupRewardConfig';

const base = 'https://res.cloudinary.com/demo/image/upload/v1/coupon.png';
const out = cloudinaryAttachmentUrl(base);
assert.match(out, /\/upload\/l_text:Arial_70_bold:\d+\.\d+\.\d+,co_white,g_south,y_60\/fl_attachment\//, out);

assert.strictEqual(cloudinaryAttachmentUrl('https://example.com/x.png'), 'https://example.com/x.png');

const pdf = 'https://res.cloudinary.com/demo/image/upload/v1/coupon.pdf';
assert.strictEqual(cloudinaryAttachmentUrl(pdf), 'https://res.cloudinary.com/demo/image/upload/fl_attachment/v1/coupon.pdf');

const already = 'https://res.cloudinary.com/demo/image/upload/fl_attachment/v1/x.png';
assert.strictEqual(cloudinaryAttachmentUrl(already), already);

console.log('OK', out);
