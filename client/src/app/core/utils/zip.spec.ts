// The export ZIP must open in standard tools; checked here by re-reading it with the archive's own structure.
import { crc32, zipBytes } from './zip';

describe('zip writer', () => {
  it('crc32 matches the standard check value', () => {
    expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xCBF43926);
  });
  it('writes every file stored, with its name, size and checksum, and a central directory that points back at them', () => {
    const files = [{ name: 'factions.csv', data: 'Id,Name\nf,Fé "x"' }, { name: 'faction-goals.csv', data: 'Id\ng' }];
    const z = zipBytes(files, new Date(2026, 9, 19, 12, 0, 0)), v = new DataView(z.buffer);
    const end = z.length - 22;
    expect(v.getUint32(end, true)).toBe(0x06054b50);
    expect(v.getUint16(end + 10, true)).toBe(2);
    let at = v.getUint32(end + 16, true);
    const dec = new TextDecoder();
    for (const f of files) {
      expect(v.getUint32(at, true)).toBe(0x02014b50);
      const size = v.getUint32(at + 24, true), nameLen = v.getUint16(at + 28, true), local = v.getUint32(at + 42, true);
      expect(dec.decode(z.slice(at + 46, at + 46 + nameLen))).toBe(f.name);
      const body = z.slice(local + 30 + nameLen, local + 30 + nameLen + size);
      expect(dec.decode(body)).toBe(f.data);
      expect(v.getUint32(at + 16, true)).toBe(crc32(new TextEncoder().encode(f.data)));
      at += 46 + nameLen;
    }
  });
});
