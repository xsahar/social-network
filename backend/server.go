package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"socialnetwork/pkg/db/sqlite"
	web "socialnetwork/web"
)

func main() {

	dbPath := "data/socialnetwork.db"

	if err := os.MkdirAll(filepath.Dir(dbPath), os.ModePerm); err != nil {
		log.Fatal("failed to create db folder:", err)
	}

	db, err := sqlite.ConnectAndMigrate(dbPath, "pkg/db/migrations/sqlite")
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	fmt.Println("✅ Database tables checked and initialized.")

	staticDir := "../frontend-next"
	fs := http.FileServer(http.Dir(staticDir))
	http.Handle("/", fs)
	fmt.Printf("✅ Serving static files from %s\n", staticDir)

	web.ConnectWeb(db)

}
