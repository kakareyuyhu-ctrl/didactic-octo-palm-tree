export default function Settings() {
  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">Settings</h1>
      <div className="card">
        <div className="card-body space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700">Company name</label>
            <input className="mt-1 w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand" placeholder="Pat services" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Support email</label>
            <input className="mt-1 w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand" placeholder="support@example.com" />
          </div>
          <button className="btn">Save changes</button>
        </div>
      </div>
    </div>
  );
}