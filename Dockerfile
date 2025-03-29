FROM python:3.8

# install tesseract 4.1.1
# https://stackoverflow.com/questions/68425067/how-do-i-install-tesseract-ocr-v4-1-1-in-a-docker-image
RUN export PATH=/user/local/bin:$PATH 

RUN apt-get update && \
    apt-get install libleptonica-dev automake make pkg-config libsdl-pango-dev libicu-dev libcairo2-dev bc ffmpeg libsm6 libxext6 -y && \
    wget github.com/tesseract-ocr/tesseract/archive/4.1.1.zip && \
    unzip 4.1.1.zip && \
    cd tesseract-4.1.1 && \
    ./autogen.sh && \
    ./configure && \
    make && \
    make install && \
    ldconfig && \
    make training && \
    make training-install && \
    cd .. && \
    rm 4.1.1.zip && \
    rm -rf tesseract-4.1.1 && \
    apt-get remove libleptonica-dev automake make pkg-config libsdl-pango-dev libicu-dev libcairo2-dev bc ffmpeg libsm6 libxext6 -y  && \
    apt-get autoremove -y

# libGL.so
# https://stackoverflow.com/questions/55313610/importerror-libgl-so-1-cannot-open-shared-object-file-no-such-file-or-directo
RUN apt-get install libgl1 -y

# install PaddleOCR and fastapi
RUN python3 -m pip install paddlepaddle==3.0.0rc1 -i https://www.paddlepaddle.org.cn/packages/stable/cpu/ && \
    python3 -m pip install "paddleocr>=2.0.1" && \
    python3 -m pip install "fastapi[standard]"

# copy app files
WORKDIR /app
COPY . .

# call PaddleOCR to download models
RUN paddleocr --image_dir https://raw.githubusercontent.com/PaddlePaddle/PaddleOCR/refs/heads/main/tests/test_files/254.jpg --use_angle_cls true --lang ch && \
    paddleocr --image_dir https://raw.githubusercontent.com/PaddlePaddle/PaddleOCR/refs/heads/main/tests/test_files/254.jpg --use_angle_cls true --lang en && \
    paddleocr --image_dir https://raw.githubusercontent.com/PaddlePaddle/PaddleOCR/refs/heads/main/tests/test_files/254.jpg --use_angle_cls true --lang chinese_cht 

# tesseract trained data
RUN mkdir tesseract_traineddata && \
    wget https://github.com/gumblex/tessdata_chi/releases/download/v20220621/chi_v3_20220621.zip && \
    unzip -j chi_v3_20220621.zip chi_all.traineddata -d /app/tesseract_traineddata && \
    rm chi_v3_20220621.zip && \
    cd ./tesseract_traineddata && \
    wget https://github.com/tesseract-ocr/tessdata/raw/refs/heads/main/eng.traineddata && cd .. 

# set environment variables
ENV TESSDATA_PREFIX=/app/tesseract_traineddata \
    TESSLANGS=chi_all;eng; \
    PADDLELANGS=ch;en;chinese_cht; \
    PORT=8080

EXPOSE 8080

CMD ["python3", "./main.py"]
