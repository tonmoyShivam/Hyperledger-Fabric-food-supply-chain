.PHONY: network-up network-down network-reset channel deploy seed backend frontend test logs clean start stop status

network-up:
	bash scripts/setup-network.sh

network-down:
	bash scripts/stop.sh

network-reset:
	bash scripts/reset.sh

channel:
	bash scripts/create-channel.sh

deploy:
	bash scripts/deploy-chaincode.sh

seed:
	bash scripts/seed-data.sh

start:
	bash scripts/start.sh

stop:
	bash scripts/stop.sh

status:
	bash scripts/status.sh

logs:
	bash scripts/logs.sh

backend:
	cd backend && npm install && npm run dev

frontend:
	cd frontend && npm install && npm run dev

test:
	cd blockchain/chaincode/food-traceability && npm install && npm test
	cd backend && npm test

clean: network-reset
	rm -rf backend/node_modules frontend/node_modules blockchain/chaincode/food-traceability/node_modules
