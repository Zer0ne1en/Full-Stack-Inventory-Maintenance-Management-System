.PHONY: help install dev mock dev-mock build test backend frontend docker down clean

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*## "}; {printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}'

install: ## Install frontend dependencies
	cd frontend && npm install

mock: ## Start the dev-only API stub on :8080
	node tools/mock-api/server.mjs

dev: ## Start the Vite dev server on :5173
	cd frontend && npm run dev

dev-mock: ## API stub + Vite dev server (no JDK required)
	@echo "Starting API stub and Vite together ..."
	@node tools/mock-api/server.mjs & \
	cd frontend && npm run dev

backend: ## Run the Spring Boot API on :8080 (needs JDK 17 + PostgreSQL)
	cd backend && mvn spring-boot:run

frontend: ## Build the production frontend bundle
	cd frontend && npm run build

test: ## Run backend tests (needs JDK 17 + Maven)
	cd backend && mvn test

smoke: ## Mount every React route in jsdom and fail on runtime errors
	cd frontend && node scripts/smoke.mjs

docker: ## Build and run the whole stack
	docker compose up --build

down: ## Stop the stack
	docker compose down

clean: ## Remove build output
	rm -rf backend/target frontend/dist frontend/node_modules/.vite
