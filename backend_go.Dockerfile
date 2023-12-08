
FROM golang:latest

RUN useradd --create-home --uid 1234 appuser
ENV PROJECT_DIR=/app \
    GO111MODULE=on \
    CGO_ENABLED=1
WORKDIR /app

COPY ./go ./

RUN chown -R appuser:appuser /app

USER 1234

RUN go get -u github.com/gin-gonic/gin

RUN go build -o main .

CMD ["./main"]