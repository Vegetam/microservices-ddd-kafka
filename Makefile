KIND_CLUSTER_NAME ?= ms-ddd-kafka
NAMESPACE ?= ms-ddd-kafka
KUSTOMIZE ?= kustomize

.PHONY: kind-up kind-down kind-build kind-load kind-deploy logs logs-order logs-payment logs-notify reset

kind-up:
	kind create cluster --name $(KIND_CLUSTER_NAME) --config scripts/kind/cluster.yaml || true
	kubectl cluster-info
	# Ingress NGINX (kind)
	kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.11.3/deploy/static/provider/kind/deploy.yaml
	kubectl wait --namespace ingress-nginx --for=condition=Ready pod --selector=app.kubernetes.io/component=controller --timeout=180s

kind-build:
	docker build -t microservices-ddd-kafka/order-service:kind -f src/OrderService/Dockerfile .
	docker build -t microservices-ddd-kafka/payment-service:kind -f src/PaymentService/Dockerfile .
	docker build -t microservices-ddd-kafka/notification-service:kind -f src/NotificationService/Dockerfile .

kind-load:
	kind load docker-image microservices-ddd-kafka/order-service:kind --name $(KIND_CLUSTER_NAME)
	kind load docker-image microservices-ddd-kafka/payment-service:kind --name $(KIND_CLUSTER_NAME)
	kind load docker-image microservices-ddd-kafka/notification-service:kind --name $(KIND_CLUSTER_NAME)

kind-deploy: kind-build kind-load
	$(KUSTOMIZE) build --enable-helm k8s/kustomize/overlays/kind | kubectl apply -f -
	kubectl -n $(NAMESPACE) get all

logs: logs-order

logs-order:
	kubectl -n $(NAMESPACE) logs -f deploy/order-service --tail=200

logs-payment:
	kubectl -n $(NAMESPACE) logs -f deploy/payment-service --tail=200

logs-notify:
	kubectl -n $(NAMESPACE) logs -f deploy/notification-service --tail=200

kind-down:
	kind delete cluster --name $(KIND_CLUSTER_NAME)

reset:
	kubectl delete namespace $(NAMESPACE) --ignore-not-found=true
	kind delete cluster --name $(KIND_CLUSTER_NAME) || true
