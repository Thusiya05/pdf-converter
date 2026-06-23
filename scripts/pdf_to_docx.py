import sys

from pdf2docx import Converter


def main():
    if len(sys.argv) != 3:
        print("usage: pdf_to_docx.py <input.pdf> <output.docx>", file=sys.stderr)
        sys.exit(1)

    src, dst = sys.argv[1], sys.argv[2]
    cv = Converter(src)
    try:
        cv.convert(dst)
    finally:
        cv.close()


if __name__ == "__main__":
    main()
