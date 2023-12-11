package utils

import (
	"io"
	"net/http"
)

func HttpGet(url string) ([]byte, int, error) {
	res, err := http.Get(url)
	if err != nil {
		return nil, 500, err
	}

	defer res.Body.Close()

	body, err2 := io.ReadAll(res.Body)
	if err2 != nil {
		return nil, 500, err2
	}

	return body, res.StatusCode, nil
}

// package utils

// import "github.com/valyala/fasthttp"

// // Use fasthttp instead of net/http
// func HttpGet(url string) ([]byte, int, error) {
// 	req := fasthttp.AcquireRequest()
// 	req.SetRequestURI(url)
// 	req.Header.SetMethod("GET")

// 	resp := fasthttp.AcquireResponse()
// 	defer fasthttp.ReleaseResponse(resp)

// 	err := fasthttp.Do(req, resp)
// 	if err != nil {
// 		return nil, 500, err
// 	}

// 	return resp.Body(), resp.StatusCode(), nil
// }
