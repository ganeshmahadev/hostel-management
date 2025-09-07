import { SignIn } from '@clerk/nextjs'
import { Building } from 'lucide-react'

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <Building className="h-12 w-12 text-primary mx-auto mb-4" />
          <h1 className="text-2xl font-bold">Welcome Back</h1>
          <p className="text-muted-foreground mt-2">
            Sign in to access the hostel room booking system
          </p>
        </div>
        <SignIn 
          appearance={{
            elements: {
              formButtonPrimary: "bg-primary hover:bg-primary/90 text-primary-foreground",
              card: "shadow-lg border",
              headerTitle: "hidden",
              headerSubtitle: "hidden"
            }
          }} 
        />
      </div>
    </div>
  )
}