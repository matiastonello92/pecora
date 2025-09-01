## Permissions fix

- **Causa:** la query `user_roles` restituisce `roles` come array; il loop precedente presupponeva un oggetto.
- **Fix:** iterazione annidata `roles[] -> role_permissions[]` con tipi minimi per rispettare la shape.
- **Impatto DB:** nessuno.
