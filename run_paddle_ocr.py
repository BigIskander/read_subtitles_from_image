import sys
from paddleocr import PaddleOCR

img_bytes = sys.stdin.buffer.read()
lang = sys.argv[1]
det = False
if len(sys.argv) > 2:
    det = (sys.argv[2] == "multiline")

ocr = PaddleOCR(use_angle_cls=True, lang=lang) # need to run only once to load model into memory
result = ocr.ocr(img_bytes, det=det, cls=True) # det=False, 
for idx in range(len(result)):
    res = result[idx]
    if res:
        if det:
            for line in res:
                # make somewhat simmilar output, so same regex can be used
                print(" ppocr INFO: ('" + line[1][0] + "', " + str(line[1][1]) + ") ")
        else:
            for line in res:
                print(" ppocr INFO: ('" + line[0] + "', " + str(line[1]) + ") ")