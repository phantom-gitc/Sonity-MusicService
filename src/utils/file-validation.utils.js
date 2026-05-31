const imageSignatures = {
  "image/jpeg": [[0xff, 0xd8, 0xff]],
  "image/png": [[0x89, 0x50, 0x4e, 0x47]],
  "image/webp": [[0x52, 0x49, 0x46, 0x46]],
};

const audioSignatures = {
  "audio/mpeg": [[0x49, 0x44, 0x33], [0xff, 0xfb], [0xff, 0xf3], [0xff, 0xf2]],
  "audio/wav": [[0x52, 0x49, 0x46, 0x46]],
  "audio/ogg": [[0x4f, 0x67, 0x67, 0x53]],
  "audio/flac": [[0x66, 0x4c, 0x61, 0x43]],
  "audio/mp4": [[0x00, 0x00, 0x00]],
};

function startsWith(buffer, signature) {
  return signature.every((byte, index) => buffer[index] === byte);
}

// Confirms uploaded media content matches the declared MIME type.
export function isValidMediaBuffer(file) {
  if (file?.mimetype === "image/webp") {
    return startsWith(file.buffer, imageSignatures["image/webp"][0])
      && file.buffer.slice(8, 12).toString("ascii") === "WEBP";
  }

  if (file?.mimetype === "audio/wav") {
    return startsWith(file.buffer, audioSignatures["audio/wav"][0])
      && file.buffer.slice(8, 12).toString("ascii") === "WAVE";
  }

  if (file?.mimetype === "audio/mp4") {
    return startsWith(file.buffer, audioSignatures["audio/mp4"][0])
      && file.buffer.slice(4, 8).toString("ascii") === "ftyp";
  }

  const signatures = { ...imageSignatures, ...audioSignatures }[file?.mimetype] || [];
  return signatures.some((signature) => startsWith(file.buffer, signature));
}
