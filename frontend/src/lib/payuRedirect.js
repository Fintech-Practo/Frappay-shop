export const redirectToPayU = (payuData) => {
  const form = document.createElement("form");
  form.method = "POST";
  form.action = payuData.action;

  Object.keys(payuData).forEach((key) => {
    if (key !== "action") {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = key;
      input.value = payuData[key];
      form.appendChild(input);
    }
  });

  document.body.appendChild(form);
  form.submit();
};
