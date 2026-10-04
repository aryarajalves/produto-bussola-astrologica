-- Script de inicialização automática do banco de testes isolado
SELECT 'CREATE DATABASE bussolaapp_test'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'bussolaapp_test')\gexec
