"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Upload, FileText, Image, File, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function Home() {
   const [dragActive, setDragActive] = useState(false);
   const [isUploading, setIsUploading] = useState(false);
   const [uploadProgress, setUploadProgress] = useState("");
   const router = useRouter();
   const searchParams = useSearchParams();

   // Function to set the upload cookie
   const setUploadCookie = () => {
      document.cookie = "hasUploadedFile=true; path=/; max-age=86400"; // 24 hours
      console.log("[Home] Cookie set: hasUploadedFile=true");
   };

   const handleDrag = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.type === "dragenter" || e.type === "dragover") {
         setDragActive(true);
      } else if (e.type === "dragleave") {
         setDragActive(false);
      }
   };

   const uploadFile = async (file: File) => {
      setIsUploading(true);
      setUploadProgress("Uploading file...");

      try {
         // Set cookie that user has uploaded a file
         setUploadCookie();
         router.push("/working-agents");
         const totalAgentTime = 15000;

         const formData = new FormData();
         formData.append("file", file);
         formData.append("max_slides", "5");
         formData.append("title", file.name.replace(/\.[^/.]+$/, ""));

         const apiPromise = fetch("http://localhost:8000/create-slides", {
            method: "POST",
            body: formData,
         });

         await new Promise((resolve) => setTimeout(resolve, totalAgentTime));

         const response = await apiPromise;

         if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
         }

         const result = await response.json();

         if (result.success) {
            sessionStorage.setItem("slideData", JSON.stringify(result));
         } else {
            throw new Error("Failed to create slides");
         }
      } catch (error) {
         console.error("Upload error:", error);
         setUploadProgress("Upload failed. Please try again.");
         setTimeout(() => {
            setIsUploading(false);
            setUploadProgress("");
            router.push("/");
         }, 3000);
      }
   };

   const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
         const file = e.dataTransfer.files[0];
         uploadFile(file);
      }
   };

   const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
         const file = e.target.files[0];
         uploadFile(file);
      }
   };

   return (
      <div className="min-h-screen bg-background flex flex-col">
         {/* Header */}
         <header className="border-b border-border">
            <div className="container mx-auto px-6 py-4">
               <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                     <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                        <FileText className="w-5 h-5 text-primary-foreground" />
                     </div>
                     <h1 className="text-2xl font-bold text-foreground">
                        Lovaslide
                     </h1>
                  </div>
                  <ThemeToggle />
               </div>
            </div>
         </header>

         {/* Main Content */}
         <main className="flex-1 flex items-center justify-center p-6">
            <div className="w-full max-w-6xl mx-auto">
               {/* Upload Card */}
               <Card className="border-2 border-dashed border-border hover:border-primary/50 transition-all duration-300 hover:shadow-lg">
                  <CardContent className="p-16">
                     <div
                        className={`relative transition-all duration-300 ${
                           dragActive ? "scale-105" : ""
                        }`}
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}
                     >
                        <input
                           type="file"
                           multiple
                           onChange={handleFileInput}
                           className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                           accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.gif"
                        />

                        <div className="text-center">
                           <div className="mx-auto w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
                              {isUploading ? (
                                 <Loader2 className="w-10 h-10 text-primary animate-spin" />
                              ) : (
                                 <Upload className="w-10 h-10 text-primary" />
                              )}
                           </div>

                           {isUploading ? (
                              <>
                                 <h3 className="text-2xl font-semibold text-foreground mb-4">
                                    {uploadProgress}
                                 </h3>
                                 <p className="text-muted-foreground mb-6">
                                    Please wait while we process your file...
                                 </p>
                              </>
                           ) : (
                              <>
                                 <h3 className="text-2xl font-semibold text-foreground mb-4">
                                    Drag your files here
                                 </h3>
                                 <p className="text-muted-foreground mb-6">
                                    or click to select your files
                                 </p>
                                 <div className="flex flex-wrap justify-center gap-4 mb-8">
                                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                                       <FileText className="w-4 h-4" />
                                       <span>PDF, DOC, PPT, TXT</span>
                                    </div>
                                 </div>
                                 <Button
                                    size="lg"
                                    className="bg-primary hover:bg-primary/90"
                                    disabled={isUploading}
                                 >
                                    <Upload className="w-4 h-4 mr-2" />
                                    Browse Files
                                 </Button>
                              </>
                           )}
                        </div>
                     </div>
                  </CardContent>
               </Card>
            </div>
         </main>

         {/* Footer */}
         <footer className="border-t border-border py-8">
            <div className="container mx-auto px-6 text-center">
               <p className="text-muted-foreground">
                  © 2025 Lovaslide. All rights reserved.
               </p>
            </div>
         </footer>
      </div>
   );
}
