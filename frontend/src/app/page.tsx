"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Upload, FileText, Loader2, X, Sparkles } from "lucide-react";
import { useState } from "react";
import type { ChangeEvent, DragEvent } from "react";
import { useRouter } from "next/navigation";

const MAX_FILES = 3;

const formatFileSize = (size: number) => {
   if (size >= 1024 * 1024) {
      return `${(size / (1024 * 1024)).toFixed(1)} MB`;
   }
   if (size >= 1024) {
      return `${(size / 1024).toFixed(1)} KB`;
   }
   return `${size} B`;
};

const getFileKey = (file: File) => `${file.name}-${file.size}-${file.lastModified}`;

export default function Home() {
   const [dragActive, setDragActive] = useState(false);
   const [isUploading, setIsUploading] = useState(false);
   const [uploadProgress, setUploadProgress] = useState("");
   const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
   const [errorMessage, setErrorMessage] = useState("");
   const router = useRouter();

   const isAtLimit = selectedFiles.length >= MAX_FILES;

   // Function to set the upload cookie
   const setUploadCookie = () => {
      document.cookie = "hasUploadedFile=true; path=/; max-age=86400"; // 24 hours
      console.log("[Home] Cookie set: hasUploadedFile=true");
   };

   const addFiles = (fileList: FileList | File[]) => {
      if (!fileList) return;
      const incoming = Array.from(fileList);
      if (!incoming.length) return;

      const existingKeys = new Set(selectedFiles.map(getFileKey));
      const nextFiles = [...selectedFiles];
      let accepted = 0;

      for (const file of incoming) {
         const key = getFileKey(file);
         if (existingKeys.has(key)) {
            continue;
         }
         if (nextFiles.length >= MAX_FILES) {
            break;
         }
         nextFiles.push(file);
         existingKeys.add(key);
         accepted += 1;
      }

      if (accepted === 0) {
         if (selectedFiles.length >= MAX_FILES) {
            setErrorMessage(`You can upload up to ${MAX_FILES} files.`);
         }
         return;
      }

      setSelectedFiles(nextFiles);
      if (accepted < incoming.length) {
         setErrorMessage(`You can upload up to ${MAX_FILES} files.`);
      } else {
         setErrorMessage("");
      }
   };

   const handleDrag = (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      if (isUploading) {
         return;
      }
      if (e.type === "dragenter" || e.type === "dragover") {
         setDragActive(true);
      } else if (e.type === "dragleave") {
         setDragActive(false);
      }
   };

   const handleDrop = (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      if (isUploading) {
         return;
      }
      setDragActive(false);

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
         addFiles(e.dataTransfer.files);
      }
   };

   const handleFileInput = (e: ChangeEvent<HTMLInputElement>) => {
      if (isUploading) {
         return;
      }
      if (e.target.files && e.target.files.length > 0) {
         addFiles(e.target.files);
         e.target.value = "";
      }
   };

   const removeFile = (index: number) => {
      if (isUploading) {
         return;
      }
      setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
      setErrorMessage("");
   };

   const clearFiles = () => {
      if (isUploading) {
         return;
      }
      setSelectedFiles([]);
      setErrorMessage("");
   };

   const startProcessing = async () => {
      if (!selectedFiles.length || isUploading) {
         return;
      }

      setErrorMessage("");
      setIsUploading(true);
      setUploadProgress(`Uploading ${selectedFiles.length} file${selectedFiles.length > 1 ? "s" : ""}...`);
      setDragActive(false);

      try {
         const filesToUpload = [...selectedFiles];
         setUploadCookie();
         router.push("/working-agents");
         const totalAgentTime = 15000;

         const formData = new FormData();
         filesToUpload.forEach((file) => {
            formData.append("files", file);
         });
         formData.append("max_slides", "5");
         const derivedTitle = filesToUpload.length === 1
            ? filesToUpload[0].name.replace(/\.[^/.]+$/, "")
            : "Combined Presentation";
         formData.append("title", derivedTitle);

         const apiPromise = fetch("http://localhost:8000/create-slides", {
            method: "POST",
            body: formData,
         });

         await new Promise((resolve) => setTimeout(resolve, totalAgentTime));
         setUploadProgress("Finalizing presentation...");

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
                        } ${isUploading ? "pointer-events-none opacity-80" : ""}`}
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}
                     >
                        <input
                           type="file"
                           multiple
                           disabled={isUploading || isAtLimit}
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
                                    Please wait while we process your files...
                                 </p>
                              </>
                           ) : (
                              <>
                                 <h3 className="text-2xl font-semibold text-foreground mb-4">
                                    Drag your files here
                                 </h3>
                                 <p className="text-muted-foreground mb-6">
                                    or click to select up to {MAX_FILES} files
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
                                    disabled={isUploading || isAtLimit}
                                 >
                                    <Upload className="w-4 h-4 mr-2" />
                                    Browse Files
                                 </Button>
                              </>
                           )}
                        </div>
                     </div>

                     {selectedFiles.length > 0 && (
                        <div className="mt-10 text-left">
                           <h4 className="text-sm font-semibold text-muted-foreground mb-3">
                              Selected files ({selectedFiles.length}/{MAX_FILES})
                           </h4>
                           <div className="space-y-2">
                              {selectedFiles.map((file, index) => (
                                 <div
                                    key={getFileKey(file)}
                                    className="flex items-center justify-between rounded-lg border border-border bg-muted/40 px-4 py-3"
                                 >
                                    <div className="flex items-center space-x-3">
                                       <FileText className="w-4 h-4 text-muted-foreground" />
                                       <div>
                                          <p className="text-sm font-medium text-foreground">{file.name}</p>
                                          <p className="text-xs text-muted-foreground">
                                             {formatFileSize(file.size)}
                                          </p>
                                       </div>
                                    </div>
                                    {!isUploading && (
                                       <button
                                          type="button"
                                          onClick={() => removeFile(index)}
                                          className="p-1 rounded-md text-muted-foreground hover:bg-muted transition"
                                          aria-label={`Remove ${file.name}`}
                                       >
                                          <X className="w-4 h-4" />
                                       </button>
                                    )}
                                 </div>
                              ))}
                           </div>
                        </div>
                     )}

                     <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm text-muted-foreground">
                           You can upload up to {MAX_FILES} files. {isAtLimit ? "Maximum reached." : ""}
                        </p>
                        <div className="flex items-center justify-end gap-2">
                           {selectedFiles.length > 0 && !isUploading && (
                              <Button variant="ghost" onClick={clearFiles}>
                                 Clear files
                              </Button>
                           )}
                           <Button
                              size="lg"
                              onClick={startProcessing}
                              disabled={selectedFiles.length === 0 || isUploading}
                              className="bg-primary hover:bg-primary/90"
                           >
                              {isUploading ? (
                                 <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Processing...
                                 </>
                              ) : (
                                 <>
                                    <Sparkles className="w-4 h-4 mr-2" />
                                    Generate Presentation
                                 </>
                              )}
                           </Button>
                        </div>
                     </div>

                     {errorMessage && (
                        <p className="mt-4 text-sm text-destructive">{errorMessage}</p>
                     )}
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
