import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import logoImg from "@/assets/scoutPic/avatars-logo.jpg";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center mb-6">
            <div className="w-16 h-16 rounded-full overflow-hidden ring-2 ring-primary/20 mb-4">
              <img
                src={logoImg}
                alt="Saint George Scouts"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-8 w-8 text-red-500" />
              <h1 className="text-2xl font-bold text-gray-900">404 Page Not Found</h1>
            </div>
          </div>

          <p className="mt-4 text-sm text-gray-600 text-center">
            Did you forget to add the page to the router?
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
