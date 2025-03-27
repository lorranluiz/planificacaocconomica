# Changelog

- As próximas atualizações irão usar mudanças no repositório para gerar a descrição das mudanças feitas usando o padrão:

- Added (Adicionado): Novos recursos ou funcionalidades.
- Changed (Alterado): Alterações em funcionalidades existentes.
- Deprecated (Descontinuado): Funcionalidades descontinuadas.
- Removed (Removido): Funcionalidades removidas.
- Fixed (Corrigido): Correções de bugs.
- Security (Segurança): Mudanças relacionadas a segurança

## v0.2.1-alpha (03/27/2025)
- Start of optimization in database transactions to optimize data flow, mainly regarding speed .

## v0.2.0-alpha (03/03/2025)
- Beginning of implementation using a database. The initially chosen database has been PostgreSQL.
- For this reason, the language for the business logic on the server was changed to Java.
- Server modeling.
- Implementation of the server with the `schema.sql` file provided.
- Implementation of registration and listing pages for all involved entities.
- Implementation of a fully functional prototype screen for registering, editing, planning, and optimizing all data of a Popular Council.
- Planning calculation performed correctly.
- Optimization calculation performed correctly (but can still be improved).

## v0.1.0-alpha (11/11/2024)

- Project creation.
- Initial functionalities.
- The project started on 11/11/2024, but its upload to a remote Git repository occurred on 01/07/2025 (almost two months after its start) .
- Creation of Councils, Committees, Neighborhood Associations, Non-Council Members (non-council workers), and products.
- Storage in `.json` file.
- Server using Node.JS.
- User-friendly, appealing, and futuristic visual interface.
- Connected to WebRadio Censura Livre internet radio.
- Functionalities:
    - User login and registration.
	- Registration of Councils, Committees, and Neighborhood Associations, associated with the first user registered for those respective instances.
	- Registration of Sectors and Products directly in the Technological Matrix table.
	- Dynamic and automated interaction between data from the Technological Matrix tables, Demand Vector, and Production Vector (Planning Result).
	- Modal windows for specifying input parameters for optimization.
	- Modal windows displaying optimization results for each planned and optimized product.
	- Screens for Council Members of Popular Councils, Committees, and Non-Council Workers.
	- Tree connection to integrate the entirety of the economy into the planning.
	- Screen for Non-Council Workers designed like an online store, to be more familiar to new users.
	- "Cost" calculation appearing as if it were prices in online stores (although it is not), based on the fraction of work done by the worker compared to the total work of the entire society. This acts as the "credits" that the user has to spend to obtain what they need, but this value does not circulate like money. On the contrary, it is eliminated at the time of product acquisition. It is only deducted from the user acquiring the product; it does not go to another "account." The "salary" of the producer or "seller" is actually also the fraction of individual work performed relative to the total work produced by the entire society, a calculation indicated by Marx himself in the Critique of the Gotha Program.