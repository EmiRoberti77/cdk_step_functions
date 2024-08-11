export const handler = async (): Promise<any> => {
  const value = Math.random();
  console.log("RandomLambdaFunction has been excecuted", value);
  return {
    value,
  };
};
