-- Planos pagos com os nomes e preços do site (decisão do dono, 18/11/2026), para a cobrança pelo Asaas.
-- Os códigos não mudam (centros, testes e funções continuam apontando para eles): basico = Quadra Pro, pro = Arena Business.
update public.plans set name = 'Quadra Pro', price_cents = 9990 where code = 'basico';
update public.plans set name = 'Arena Business', price_cents = 19990 where code = 'pro';
