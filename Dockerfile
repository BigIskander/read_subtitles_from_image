FROM alpine:3.15.0

# install tesseract-ocr nodejs and npm
RUN apk add tesseract-ocr
RUN apk add nodejs
RUN apk add npm

# copy app files and install node js depencies
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY . .

# tesseract trained data
RUN mkdir tesseract_traineddata
RUN wget https://github.com/gumblex/tessdata_chi/releases/download/v20220621/chi_v3_20220621.zip
RUN unzip chi_v3_20220621.zip -d /app/tesseract_traineddata
RUN rm chi_v3_20220621.zip

# set environment variables
ENV TESSDATA_PREFIX=/app/tesseract/traineddata
ENV PORT=8080

EXPOSE 8080

CMD ["node", "app.js"]
