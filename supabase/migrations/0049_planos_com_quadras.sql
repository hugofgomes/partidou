-- Correção: os planos herdados da base antiga (teste, basico, pro, premium) não tinham o módulo "quadras".
-- Resultado: todo centro novo (começa no Teste gratuito) via "Módulo indisponível". Só o plano interno "ilimitado" tinha.
-- Decisão do dono (18/11/2026): o módulo Quadra Esportiva entra em todos os planos. Os demais módulos não mudam.
update public.plans set modules = array_append(modules, 'quadras') where not ('quadras' = any (modules));
