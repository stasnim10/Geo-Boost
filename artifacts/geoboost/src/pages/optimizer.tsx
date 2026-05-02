import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useOptimizeContent, OptimizeResult } from "@workspace/api-client-react";
import { Loader2, Copy, CheckCircle2, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export default function Optimizer() {
  const optimizeMutation = useOptimizeContent();
  const [content, setContent] = useState("");
  const [queries, setQueries] = useState("");
  const [result, setResult] = useState<OptimizeResult | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const storedQueries = sessionStorage.getItem("geoboost_audit_queries");
    if (storedQueries) {
      try {
        const parsed = JSON.parse(storedQueries);
        setQueries(parsed.join(", "));
      } catch (e) {}
    }
  }, []);

  const handleOptimize = () => {
    if (!content.trim() || !queries.trim()) return;
    
    optimizeMutation.mutate({
      data: {
        content,
        queries: queries.split(",").map(q => q.trim()).filter(Boolean)
      }
    }, {
      onSuccess: (data) => {
        setResult(data);
      }
    });
  };

  const handleCopy = () => {
    if (result) {
      navigator.clipboard.writeText(result.optimizedContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 md:px-8 h-[calc(100vh-72px)] flex flex-col">
      <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Content Optimizer</h1>
          <p className="text-slate-500 mt-1">Re-structure your content for maximum AI visibility.</p>
        </div>
        {!result && (
          <div className="w-full md:w-auto flex-1 max-w-md">
            <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">Target Queries (comma separated)</Label>
            <Input 
              value={queries}
              onChange={e => setQueries(e.target.value)}
              placeholder="e.g. best CRM for startups, CRM pricing"
              className="bg-white border-slate-200"
            />
          </div>
        )}
      </div>

      {!result ? (
        <div className="flex-1 flex flex-col space-y-4 min-h-0">
          <Textarea 
            className="flex-1 resize-none bg-white border-slate-200 text-base p-6 leading-relaxed shadow-sm font-mono focus-visible:ring-1 focus-visible:ring-blue-500 focus-visible:border-blue-500"
            placeholder="Paste your page content here..."
            value={content}
            onChange={e => setContent(e.target.value)}
          />
          <Button 
            size="lg" 
            onClick={handleOptimize}
            disabled={optimizeMutation.isPending || !content.trim()}
            className="w-full md:w-auto self-end bg-[#0f172a] hover:bg-slate-800 text-white font-bold h-14 px-8 text-lg"
          >
            {optimizeMutation.isPending ? (
              <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Optimizing...</>
            ) : (
              "Optimize Content"
            )}
          </Button>
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex justify-between items-center mb-4">
             <div className="flex items-center gap-3">
               <Button variant="outline" size="sm" onClick={() => setResult(null)}>Start Over</Button>
             </div>
             <Button 
               size="sm" 
               variant="default"
               onClick={handleCopy}
               className="bg-blue-600 hover:bg-blue-700 text-white font-medium"
             >
               {copied ? <><CheckCircle2 className="w-4 h-4 mr-2" /> Copied</> : <><Copy className="w-4 h-4 mr-2" /> Copy Optimized</>}
             </Button>
          </div>
          
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 min-h-0">
            <div className="flex flex-col border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
              <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 font-semibold text-slate-700 flex items-center justify-between">
                Original Content
              </div>
              <div className="p-6 overflow-y-auto flex-1 font-mono text-sm leading-relaxed text-slate-600 whitespace-pre-wrap">
                {result.originalContent}
              </div>
            </div>
            
            <div className="flex flex-col border border-green-200 rounded-xl overflow-hidden bg-white shadow-sm ring-1 ring-green-500/20">
              <div className="bg-green-50 px-4 py-3 border-b border-green-200 font-semibold text-green-800 flex items-center justify-between">
                Optimized for AI
              </div>
              <div className="p-6 overflow-y-auto flex-1 font-mono text-sm leading-relaxed text-slate-900 whitespace-pre-wrap relative">
                {/* Very simplistic highlighting implementation for the sake of the mockup */}
                <div className="bg-green-50/50 p-4 border border-green-100 rounded-lg mb-6 shadow-sm">
                  <h4 className="font-bold text-green-800 mb-2 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" /> Changes Applied:
                  </h4>
                  <ul className="space-y-2">
                    {result.changes.map((change, i) => (
                      <li key={i} className="text-sm flex gap-2">
                        <Tooltip>
                          <TooltipTrigger>
                            <span className="inline-flex items-center justify-center bg-green-200 text-green-800 text-xs font-bold px-2 py-0.5 rounded cursor-help">
                              {change.type}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p>{change.reason}</p>
                          </TooltipContent>
                        </Tooltip>
                        <span className="text-slate-600">{change.reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                {result.optimizedContent}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
