FROM alpine:3.15.0

# install tesseract-ocr nodejs and npm
RUN apk --no-cache add tesseract-ocr nodejs npm 

# copy app files and install node js depencies
WORKDIR /app
COPY . .
RUN npm install --omit=dev

# tesseract trained data
RUN mkdir tesseract_traineddata \
&& wget https://github.com/gumblex/tessdata_chi/releases/download/v20220621/chi_v3_20220621.zip \
&& unzip -j chi_v3_20220621.zip chi_all.traineddata -d /app/tesseract_traineddata \
&& rm chi_v3_20220621.zip

# set environment variables
ENV TESSDATA_PREFIX=/app/tesseract_traineddata
ENV TESSLANG=chi_all
ENV PORT=8080

EXPOSE 8080

CMD ["node", "app.js"]
