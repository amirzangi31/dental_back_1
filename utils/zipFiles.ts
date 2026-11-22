import fs from "fs";
import path from "path";
import { crc32 } from "zlib";

type ZipEntry = {
  name: string;
  filePath: string;
};

const dosDateTime = (date: Date) => {
  const time =
    (date.getHours() << 11) |
    (date.getMinutes() << 5) |
    Math.floor(date.getSeconds() / 2);
  const dosDate =
    ((date.getFullYear() - 1980) << 9) |
    ((date.getMonth() + 1) << 5) |
    date.getDate();
  return { time, date: dosDate };
};

const writeU16 = (buffer: Buffer, value: number, offset: number) => {
  buffer.writeUInt16LE(value & 0xffff, offset);
};

const writeU32 = (buffer: Buffer, value: number, offset: number) => {
  buffer.writeUInt32LE(value >>> 0, offset);
};

export const zipStoredFiles = async (entries: ZipEntry[], outputPath: string) => {
  await fs.promises.mkdir(path.dirname(outputPath), { recursive: true });
  const handle = await fs.promises.open(outputPath, "w");
  const { time, date } = dosDateTime(new Date());
  const locals: {
    name: Buffer;
    crc: number;
    size: number;
    offset: number;
  }[] = [];
  let offset = 0;

  try {
    for (const entry of entries) {
      const absolute = path.isAbsolute(entry.filePath)
        ? entry.filePath
        : path.join(process.cwd(), entry.filePath);
      const data = await fs.promises.readFile(absolute);
      const name = Buffer.from(entry.name, "utf8");
      const checksum = crc32(data) >>> 0;
      const local = Buffer.alloc(30);
      writeU32(local, 0x04034b50, 0);
      writeU16(local, 20, 4);
      writeU16(local, 0x0800, 6);
      writeU16(local, 0, 8);
      writeU16(local, time, 10);
      writeU16(local, date, 12);
      writeU32(local, checksum, 14);
      writeU32(local, data.length, 18);
      writeU32(local, data.length, 22);
      writeU16(local, name.length, 26);
      writeU16(local, 0, 28);
      await handle.write(local);
      await handle.write(name);
      await handle.write(data);
      locals.push({ name, crc: checksum, size: data.length, offset });
      offset += 30 + name.length + data.length;
    }

    const centralStart = offset;
    for (const item of locals) {
      const central = Buffer.alloc(46);
      writeU32(central, 0x02014b50, 0);
      writeU16(central, 20, 4);
      writeU16(central, 20, 6);
      writeU16(central, 0x0800, 8);
      writeU16(central, 0, 10);
      writeU16(central, time, 12);
      writeU16(central, date, 14);
      writeU32(central, item.crc, 16);
      writeU32(central, item.size, 20);
      writeU32(central, item.size, 24);
      writeU16(central, item.name.length, 28);
      writeU16(central, 0, 30);
      writeU16(central, 0, 32);
      writeU16(central, 0, 34);
      writeU16(central, 0, 36);
      writeU32(central, 0, 38);
      writeU32(central, item.offset, 42);
      await handle.write(central);
      await handle.write(item.name);
      offset += 46 + item.name.length;
    }

    const end = Buffer.alloc(22);
    writeU32(end, 0x06054b50, 0);
    writeU16(end, 0, 4);
    writeU16(end, 0, 6);
    writeU16(end, locals.length, 8);
    writeU16(end, locals.length, 10);
    writeU32(end, offset - centralStart, 12);
    writeU32(end, centralStart, 16);
    writeU16(end, 0, 20);
    await handle.write(end);
  } finally {
    await handle.close();
  }
};
