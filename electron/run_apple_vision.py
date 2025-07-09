import sys
from io import BytesIO
from ocrmac import ocrmac
from PIL import Image
# to sort the results
from functools import cmp_to_key

img_bytes = sys.stdin.buffer.read()
framework = sys.argv[1]

if(len(sys.argv) > 2):
    lang_pref = list(filter(None, sys.argv[2].split(";")))
else:
    lang_pref = []

img_bytes2 = BytesIO(img_bytes)
img_pil = Image.open(img_bytes2)

# is positions or text results one line or not
#  x, y, w, h
def is_visionocr_result_positions_inline(bbox1, bbox2):
    return not (bbox1[2][1] > (bbox2[2][1] + bbox2[2][3]) or (bbox1[2][1] + bbox1[2][3]) < bbox2[2][1])

# compare paddle ocr results to sort them
def compare_visionocr_result_positions(bbox1, bbox2):
    if is_visionocr_result_positions_inline(bbox1, bbox2):
        return bbox1[2][0] - bbox2[2][0]
    else:
        return bbox2[2][1] - bbox1[2][1]

if (framework == "VisionKit"):
    result = ocrmac.OCR(img_pil,recognition_level="accurate",language_preference=lang_pref).recognize()
else:
    result = ocrmac.OCR(img_pil,framework="livetext",language_preference=lang_pref).recognize()
output = ""
# sort results x, y, w, h
result = sorted(result, key=cmp_to_key(compare_visionocr_result_positions))
result = sorted(result, key=cmp_to_key(compare_visionocr_result_positions))
# join results
prev = None
for line in result:    
    if prev != None:
        if is_visionocr_result_positions_inline(line, prev):
            output = output + "\t" + line[0]
        else:
            print(output)
            output = line[0]
    else:
        output = line[0]
    prev = line
if output != "" and prev != None:
    print(output)


