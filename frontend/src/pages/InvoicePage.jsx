import { useParams } from "react-router-dom";

const InvoicePage = () => {
  const { id } = useParams();

  return (
    <div style={{ padding: "20px" }}>
      <h2>Invoice Page</h2>
      <p>Order ID: {id}</p>
    </div>
  );
};

export default InvoicePage;