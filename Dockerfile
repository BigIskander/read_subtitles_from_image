FROM python:3.8

# https://stackoverflow.com/questions/68425067/how-do-i-install-tesseract-ocr-v4-1-1-in-a-docker-image
RUN export PATH=/user/local/bin:$PATH 

RUN apt-get update && \ 
    apt-get install libleptonica-dev automake make pkg-config libsdl-pango-dev libicu-dev libcairo2-dev bc ffmpeg libsm6 libxext6 -y 

RUN wget github.com/tesseract-ocr/tesseract/archive/4.1.1.zip && \
    unzip 4.1.1.zip && \
    cd tesseract-4.1.1 && \
     ./autogen.sh && \
     ./configure && \
     make && \
     make install && \
     ldconfig && \
     make training && \
     make training-install && \
     tesseract --version

  # FROM alpine

# # install tesseract-ocr nodejs and npm and python and pip
# RUN apk --no-cache add tesseract-ocr nodejs npm python3 py3-pip

# # copy app files and install node js depencies
# WORKDIR /app
# COPY . .
# RUN npm install --omit=dev

# # tesseract trained data
# RUN mkdir tesseract_traineddata \
# && wget https://github.com/gumblex/tessdata_chi/releases/download/v20220621/chi_v3_20220621.zip \
# && unzip -j chi_v3_20220621.zip chi_all.traineddata -d /app/tesseract_traineddata \
# && rm chi_v3_20220621.zip \
# && cd ./tesseract_traineddata \
# && cd .. \
# && wget https://github.com/tesseract-ocr/tessdata/raw/refs/heads/main/eng.traineddata

# # install PaddleOCR
# RUN python3 -m pip install paddlepaddle==3.0.0rc1 -i https://www.paddlepaddle.org.cn/packages/stable/cpu/ --break-system-packages
# RUN pip install "paddleocr>=2.0.1" --break-system-packages

# # set environment variables
# ENV TESSDATA_PREFIX=/app/tesseract_traineddata
# ENV TESSLANGS=chi_all;eng;
# ENV PADDLELANGS=ch;en;chinese_cht;
# ENV PORT=8080

# EXPOSE 8080

# CMD ["node", "app.js"]
