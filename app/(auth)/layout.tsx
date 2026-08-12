const AuthLayout = ({
  children
}: {
  children: React.ReactNode
}) => {
  return (
    <div className="h-screen w-screen bg-no-repeat bg-cover bg-center" style={{ backgroundImage: "url('/background.webp')" }}>
      <div className="flex h-full items-center justify-center">
        <div>
          {children}
        </div>
      </div>
    </div>
  );
}

export default AuthLayout;