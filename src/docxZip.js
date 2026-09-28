// .docx(ZIP 컨테이너) 안에서 특정 항목(예: word/document.xml)을 꺼내는 최소 ZIP 리더와
// RFC 1951(DEFLATE) 압축 해제(raw inflate)를 순수 JavaScript로 직접 구현한 모듈이다.
//
// D019: UXP에는 zip/inflate 내장 API가 없고(공식 file-operation 레시피에도 없음), 이
// 프로젝트는 서드파티 라이브러리를 번들하지 않기로 했다(빌드 도구 없이 Vanilla JS만 쓰는
// D001/D004 원칙 유지, 그리고 인터넷에서 파일을 받아와 포함시키는 것 자체를 피하기 위함).
// 대신 RFC 1951 공개 표준 알고리즘을 직접 구현했다(Mark Adler의 참고 구현 puff.c에 나오는
// 고정 테이블/구조를 근거로 확인함). InDesign 문서는 전혀 건드리지 않는 순수 데이터 처리다.
//
// 이 코드는 이 프로젝트에서 아직 실제 InDesign UXP 환경에서 실행해 검증된 적이 없다 —
// 해시/CRC 검증, ZIP64, 암호화된 zip 등은 다루지 않는다(Word가 만드는 평범한 .docx만 대상).

function readUint16LE(bytes, offset) {
    return bytes[offset] | (bytes[offset + 1] << 8);
}

function readUint32LE(bytes, offset) {
    return (
        (bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] << 24)) >>> 0
    );
}

// ZIP 엔트리 이름(예: "word/document.xml")은 항상 ASCII이므로 바이트를 그대로 문자로
// 매핑해도 충분하다. 실제 텍스트 콘텐츠(한글 포함)에는 별도의 utf8BytesToString을 쓴다.
function asciiBytesToString(bytes) {
    let result = "";
    for (let i = 0; i < bytes.length; i++) {
        result += String.fromCharCode(bytes[i]);
    }
    return result;
}

// UTF-8 바이트 배열을 JS 문자열로 디코딩한다(BMP 밖의 문자는 서로게이트 쌍으로 처리).
// UXP 전역에 TextDecoder가 있는지 확인된 적이 없어, 의존하지 않고 직접 구현했다.
function utf8BytesToString(bytes) {
    let result = "";
    let i = 0;
    while (i < bytes.length) {
        const byte1 = bytes[i++];
        if (byte1 < 0x80) {
            result += String.fromCharCode(byte1);
        } else if (byte1 >= 0xc0 && byte1 < 0xe0 && i + 1 <= bytes.length) {
            const byte2 = bytes[i++];
            result += String.fromCharCode(((byte1 & 0x1f) << 6) | (byte2 & 0x3f));
        } else if (byte1 >= 0xe0 && byte1 < 0xf0 && i + 2 <= bytes.length) {
            const byte2 = bytes[i++];
            const byte3 = bytes[i++];
            result += String.fromCharCode(((byte1 & 0x0f) << 12) | ((byte2 & 0x3f) << 6) | (byte3 & 0x3f));
        } else if (byte1 >= 0xf0 && i + 3 <= bytes.length) {
            const byte2 = bytes[i++];
            const byte3 = bytes[i++];
            const byte4 = bytes[i++];
            let codepoint =
                ((byte1 & 0x07) << 18) | ((byte2 & 0x3f) << 12) | ((byte3 & 0x3f) << 6) | (byte4 & 0x3f);
            codepoint -= 0x10000;
            result += String.fromCharCode(0xd800 + (codepoint >> 10), 0xdc00 + (codepoint & 0x3ff));
        } else {
            i++; // 잘못된/불완전한 시퀀스는 건너뛴다(방어적 처리, 정상 UTF-8이면 발생하지 않음)
        }
    }
    return result;
}

// --- RFC 1951 raw DEFLATE inflate ---

function buildHuffman(codeLengths) {
    const MAXBITS = 15;
    const count = new Array(MAXBITS + 1).fill(0);
    for (let i = 0; i < codeLengths.length; i++) {
        count[codeLengths[i]]++;
    }
    count[0] = 0;

    const offsets = new Array(MAXBITS + 2).fill(0);
    for (let len = 1; len <= MAXBITS; len++) {
        offsets[len + 1] = offsets[len] + count[len];
    }

    const symbol = new Array(codeLengths.length).fill(0);
    const nextOffset = offsets.slice();
    for (let i = 0; i < codeLengths.length; i++) {
        if (codeLengths[i] !== 0) {
            symbol[nextOffset[codeLengths[i]]++] = i;
        }
    }

    return { count, symbol };
}

function makeBitReader(bytes, startByteOffset) {
    let bytePos = startByteOffset;
    let bitBuf = 0;
    let bitCount = 0;

    return {
        getBit() {
            if (bitCount === 0) {
                if (bytePos >= bytes.length) {
                    throw new Error("DEFLATE 스트림이 예상보다 일찍 끝났습니다.");
                }
                bitBuf = bytes[bytePos++];
                bitCount = 8;
            }
            const bit = bitBuf & 1;
            bitBuf >>>= 1;
            bitCount--;
            return bit;
        },
        getBits(n) {
            let value = 0;
            for (let i = 0; i < n; i++) {
                value |= this.getBit() << i;
            }
            return value >>> 0;
        },
        alignToByte() {
            bitBuf = 0;
            bitCount = 0;
        },
        get bytePos() {
            return bytePos;
        },
        set bytePos(value) {
            bytePos = value;
            bitBuf = 0;
            bitCount = 0;
        },
    };
}

function decodeSymbol(reader, huffman) {
    let code = 0;
    let first = 0;
    let index = 0;
    for (let len = 1; len <= 15; len++) {
        code |= reader.getBit();
        const countForLen = huffman.count[len];
        if (code - first < countForLen) {
            return huffman.symbol[index + (code - first)];
        }
        index += countForLen;
        first += countForLen;
        first <<= 1;
        code <<= 1;
    }
    throw new Error("잘못된 Huffman 코드를 만났습니다 — DEFLATE 스트림이 손상되었을 수 있습니다.");
}

const FIXED_LITLEN_LENGTHS = (() => {
    const lengths = new Array(288);
    for (let i = 0; i < 144; i++) lengths[i] = 8;
    for (let i = 144; i < 256; i++) lengths[i] = 9;
    for (let i = 256; i < 280; i++) lengths[i] = 7;
    for (let i = 280; i < 288; i++) lengths[i] = 8;
    return lengths;
})();
const FIXED_DIST_LENGTHS = new Array(30).fill(5);

const LENGTH_BASE = [
    3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258,
];
const LENGTH_EXTRA_BITS = [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0];
const DIST_BASE = [
    1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097,
    6145, 8193, 12289, 16385, 24577,
];
const DIST_EXTRA_BITS = [0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13];
const CODE_LENGTH_ORDER = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15];

// compressedBytes(Uint8Array)를 raw DEFLATE로 압축 해제한다. expectedLength는 ZIP Central
// Directory에 기록된 압축 해제 후 크기(정확하다고 가정하고 출력 버퍼를 미리 할당한다).
function inflateRaw(compressedBytes, expectedLength) {
    const reader = makeBitReader(compressedBytes, 0);
    const out = new Uint8Array(expectedLength);
    let outPos = 0;

    const fixedLitLenHuffman = buildHuffman(FIXED_LITLEN_LENGTHS);
    const fixedDistHuffman = buildHuffman(FIXED_DIST_LENGTHS);

    for (;;) {
        const isFinal = reader.getBit();
        const blockType = reader.getBits(2);

        if (blockType === 0) {
            reader.alignToByte();
            const len = compressedBytes[reader.bytePos] | (compressedBytes[reader.bytePos + 1] << 8);
            reader.bytePos = reader.bytePos + 4; // LEN(2)+NLEN(2), NLEN 검증은 생략
            for (let i = 0; i < len; i++) {
                out[outPos++] = compressedBytes[reader.bytePos + i];
            }
            reader.bytePos = reader.bytePos + len;
        } else if (blockType === 1 || blockType === 2) {
            let litLenHuffman;
            let distHuffman;

            if (blockType === 1) {
                litLenHuffman = fixedLitLenHuffman;
                distHuffman = fixedDistHuffman;
            } else {
                const hlit = reader.getBits(5) + 257;
                const hdist = reader.getBits(5) + 1;
                const hclen = reader.getBits(4) + 4;

                const codeLengthLengths = new Array(19).fill(0);
                for (let i = 0; i < hclen; i++) {
                    codeLengthLengths[CODE_LENGTH_ORDER[i]] = reader.getBits(3);
                }
                const codeLengthHuffman = buildHuffman(codeLengthLengths);

                const allLengths = [];
                while (allLengths.length < hlit + hdist) {
                    const symbol = decodeSymbol(reader, codeLengthHuffman);
                    if (symbol < 16) {
                        allLengths.push(symbol);
                    } else if (symbol === 16) {
                        const repeatCount = reader.getBits(2) + 3;
                        const previous = allLengths[allLengths.length - 1];
                        for (let i = 0; i < repeatCount; i++) allLengths.push(previous);
                    } else if (symbol === 17) {
                        const repeatCount = reader.getBits(3) + 3;
                        for (let i = 0; i < repeatCount; i++) allLengths.push(0);
                    } else {
                        const repeatCount = reader.getBits(7) + 11;
                        for (let i = 0; i < repeatCount; i++) allLengths.push(0);
                    }
                }

                litLenHuffman = buildHuffman(allLengths.slice(0, hlit));
                distHuffman = buildHuffman(allLengths.slice(hlit, hlit + hdist));
            }

            for (;;) {
                const symbol = decodeSymbol(reader, litLenHuffman);
                if (symbol < 256) {
                    out[outPos++] = symbol;
                } else if (symbol === 256) {
                    break;
                } else {
                    const lengthIndex = symbol - 257;
                    const length = LENGTH_BASE[lengthIndex] + reader.getBits(LENGTH_EXTRA_BITS[lengthIndex]);
                    const distSymbol = decodeSymbol(reader, distHuffman);
                    const distance = DIST_BASE[distSymbol] + reader.getBits(DIST_EXTRA_BITS[distSymbol]);
                    let copyFrom = outPos - distance;
                    for (let i = 0; i < length; i++) {
                        out[outPos++] = out[copyFrom++];
                    }
                }
            }
        } else {
            throw new Error("지원하지 않는 DEFLATE 블록 타입입니다(BTYPE=3, 예약됨/오류).");
        }

        if (isFinal) {
            break;
        }
    }

    return out;
}

// --- 최소 ZIP 리더 ---

const EOCD_SIGNATURE = 0x06054b50;
const CENTRAL_DIR_SIGNATURE = 0x02014b50;
const LOCAL_FILE_SIGNATURE = 0x04034b50;

function findEndOfCentralDirectory(bytes) {
    const maxCommentLength = 65535;
    const minEocdSize = 22;
    const searchStart = Math.max(0, bytes.length - minEocdSize - maxCommentLength);
    for (let i = bytes.length - minEocdSize; i >= searchStart; i--) {
        if (readUint32LE(bytes, i) === EOCD_SIGNATURE) {
            return i;
        }
    }
    throw new Error("ZIP End Of Central Directory 레코드를 찾지 못했습니다 — 유효한 ZIP/DOCX 파일이 아닐 수 있습니다.");
}

function extractEntryData(bytes, localHeaderOffset, compressionMethod, compressedSize, uncompressedSize) {
    if (readUint32LE(bytes, localHeaderOffset) !== LOCAL_FILE_SIGNATURE) {
        throw new Error("ZIP Local File Header 형식이 예상과 다릅니다.");
    }
    const localFileNameLength = readUint16LE(bytes, localHeaderOffset + 26);
    const localExtraFieldLength = readUint16LE(bytes, localHeaderOffset + 28);
    const dataStart = localHeaderOffset + 30 + localFileNameLength + localExtraFieldLength;
    const compressedData = bytes.subarray(dataStart, dataStart + compressedSize);

    if (compressionMethod === 0) {
        return compressedData.slice();
    }
    if (compressionMethod === 8) {
        return inflateRaw(compressedData, uncompressedSize);
    }
    throw new Error(
        `지원하지 않는 ZIP 압축 방식입니다(method=${compressionMethod}). 저장(0)과 DEFLATE(8)만 지원합니다.`
    );
}

// docxArrayBuffer(.docx 파일의 원본 바이트) 안에서 entryName(예: "word/document.xml")을
// 찾아 압축 해제된 바이트(Uint8Array)를 반환한다. 찾지 못하거나 지원하지 않는 형식이면
// Error를 던진다 — InDesign 문서는 전혀 건드리지 않는다.
function readZipEntry(docxArrayBuffer, entryName) {
    const bytes = new Uint8Array(docxArrayBuffer);
    const eocdOffset = findEndOfCentralDirectory(bytes);

    const centralDirOffset = readUint32LE(bytes, eocdOffset + 16);
    const centralDirEntryCount = readUint16LE(bytes, eocdOffset + 10);

    let offset = centralDirOffset;
    for (let i = 0; i < centralDirEntryCount; i++) {
        if (readUint32LE(bytes, offset) !== CENTRAL_DIR_SIGNATURE) {
            throw new Error("ZIP Central Directory 레코드 형식이 예상과 다릅니다.");
        }
        const compressionMethod = readUint16LE(bytes, offset + 10);
        const compressedSize = readUint32LE(bytes, offset + 20);
        const uncompressedSize = readUint32LE(bytes, offset + 24);
        const fileNameLength = readUint16LE(bytes, offset + 28);
        const extraFieldLength = readUint16LE(bytes, offset + 30);
        const fileCommentLength = readUint16LE(bytes, offset + 32);
        const localHeaderOffset = readUint32LE(bytes, offset + 42);

        const nameBytes = bytes.subarray(offset + 46, offset + 46 + fileNameLength);
        const name = asciiBytesToString(nameBytes);

        if (name === entryName) {
            return extractEntryData(bytes, localHeaderOffset, compressionMethod, compressedSize, uncompressedSize);
        }

        offset += 46 + fileNameLength + extraFieldLength + fileCommentLength;
    }

    throw new Error(`ZIP 안에서 "${entryName}" 항목을 찾지 못했습니다 — 올바른 .docx 파일이 아닐 수 있습니다.`);
}

module.exports = {
    readZipEntry,
    utf8BytesToString,
};
